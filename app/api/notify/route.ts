import { adminDb, requireUser } from "@/lib/server/admin";
import { pushConfigured, sendPush, type PushPayload } from "@/lib/server/push";

// Avisa pessoas (notificação no celular/computador) quando algo acontece num projeto.
// O app NÃO manda o texto: manda só "o que aconteceu" e o servidor confere nos dados (quem fez, em
// qual card...) e monta a mensagem. Assim ninguém consegue usar esta rota para enviar avisos falsos.

type Body =
  | { kind: "test" }
  | { kind: "assigned"; projectId: string; cardId: string; targetUserIds: string[] }
  | { kind: "comment"; projectId: string; cardId: string; commentId: string }
  | { kind: "member_added"; projectId: string; targetUserId: string }
  | { kind: "meeting"; projectId: string; meetingId: string };

const json = (data: unknown, status = 200) => Response.json(data, { status });
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

async function handle(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ ok: false, error: "Não autenticado." }, 401);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ ok: false, error: "Pedido inválido." }, 400);
  }

  if (!pushConfigured()) return json({ ok: false, reason: "not_configured" });

  const origin = new URL(request.url).origin;
  const subject = origin.startsWith("https://") ? origin : "mailto:palco@example.com";
  const db = adminDb();
  const actorSnap = await db.collection("users").doc(user.uid).get();
  const actor = (actorSnap.data()?.name as string | undefined) ?? "Alguém";

  if (body.kind === "test") {
    const result = await sendPush(
      [user.uid],
      { title: "Palco", body: "As notificações estão funcionando neste aparelho. 🎭", url: "/", tag: "test" },
      subject
    );
    return json({ ok: true, ...result });
  }

  if (typeof body.projectId !== "string" || !body.projectId) return json({ ok: false, error: "Pedido inválido." }, 400);
  const projectRef = db.collection("projects").doc(body.projectId);
  const projectSnap = await projectRef.get();
  const project = projectSnap.data() as
    | { name: string; slug: string; memberIds: string[] }
    | undefined;
  if (!project || !project.memberIds.includes(user.uid)) return json({ ok: false, error: "Sem acesso." }, 403);

  const members = new Set(project.memberIds);
  const onlyOthers = (ids: string[]) => [...new Set(ids)].filter((id) => id !== user.uid && members.has(id)).slice(0, 50);
  const base = `/projects/${project.slug}`;
  let recipients: string[] = [];
  let payload: PushPayload;

  switch (body.kind) {
    case "assigned": {
      const card = (await projectRef.collection("cards").doc(String(body.cardId)).get()).data() as
        | { title: string; assigneeIds?: string[] }
        | undefined;
      if (!card) return json({ ok: false, error: "Card não encontrado." }, 404);
      const assigned = new Set(card.assigneeIds ?? []);
      const targets = Array.isArray(body.targetUserIds) ? body.targetUserIds.filter((id) => assigned.has(id)) : [];
      recipients = onlyOthers(targets);
      payload = {
        title: project.name,
        body: `${actor} atribuiu “${clip(card.title, 80)}” a você`,
        url: `${base}/kanban`,
        tag: `card-${body.cardId}`,
      };
      break;
    }
    case "comment": {
      const comment = (await projectRef.collection("comments").doc(String(body.commentId)).get()).data() as
        | { userId: string; cardId: string; text: string }
        | undefined;
      if (!comment || comment.userId !== user.uid || comment.cardId !== body.cardId) {
        return json({ ok: false, error: "Comentário não encontrado." }, 404);
      }
      const card = (await projectRef.collection("cards").doc(String(body.cardId)).get()).data() as
        | { title: string; assigneeIds?: string[]; createdBy?: string }
        | undefined;
      if (!card) return json({ ok: false, error: "Card não encontrado." }, 404);
      recipients = onlyOthers([...(card.assigneeIds ?? []), ...(card.createdBy ? [card.createdBy] : [])]);
      payload = {
        title: `${project.name} · ${clip(card.title, 50)}`,
        body: `${actor}: ${clip(comment.text, 120)}`,
        url: `${base}/kanban`,
        tag: `comment-${body.commentId}`,
      };
      break;
    }
    case "member_added": {
      if (typeof body.targetUserId !== "string") return json({ ok: false, error: "Pedido inválido." }, 400);
      recipients = onlyOthers([body.targetUserId]);
      payload = {
        title: "Novo projeto",
        body: `${actor} adicionou você ao projeto “${clip(project.name, 80)}”`,
        url: base,
        tag: `member-${body.projectId}`,
      };
      break;
    }
    case "meeting": {
      const meeting = (await projectRef.collection("meetings").doc(String(body.meetingId)).get()).data() as
        | { title: string; createdBy: string; recurrence?: unknown }
        | undefined;
      if (!meeting || meeting.createdBy !== user.uid) return json({ ok: false, error: "Reunião não encontrada." }, 404);
      recipients = onlyOthers(project.memberIds);
      payload = {
        title: project.name,
        body: `${actor} marcou ${meeting.recurrence ? "uma reunião recorrente" : "uma reunião"}: “${clip(meeting.title, 80)}”`,
        url: `${base}/calendario`,
        tag: `meeting-${body.meetingId}`,
      };
      break;
    }
    default:
      return json({ ok: false, error: "Pedido inválido." }, 400);
  }

  const result = await sendPush(recipients, payload, subject);
  return json({ ok: true, recipients: recipients.length, ...result });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    // Ex.: a conta do servidor sem permissão no Firestore. O motivo vai para os registros do servidor.
    console.error("Falha em /api/notify", error);
    return json({ ok: false, error: "server_error", detail: (error as Error).message }, 500);
  }
}
