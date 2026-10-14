import { adminDb, requireUser } from "@/lib/server/admin";
import { fetchInstagramImage, saveInstagramImage } from "@/lib/server/instagram-image";
import { getInstagramPost } from "@/lib/instagram";

// Busca a imagem do post do Instagram de uma referência e guarda como capa.
// Corpo: { projectId, referenceId }. Só membros do projeto podem pedir.
const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ ok: false, error: "Não autenticado." }, 401);

  let body: { projectId?: unknown; referenceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Pedido inválido." }, 400);
  }
  const { projectId, referenceId } = body;
  if (typeof projectId !== "string" || typeof referenceId !== "string" || !projectId || !referenceId) {
    return json({ ok: false, error: "Pedido inválido." }, 400);
  }

  try {
    const projectRef = adminDb().collection("projects").doc(projectId);
    const project = (await projectRef.get()).data() as { memberIds?: string[] } | undefined;
    if (!project?.memberIds?.includes(user.uid)) return json({ ok: false, error: "Sem acesso." }, 403);

    const referenceRef = projectRef.collection("references").doc(referenceId);
    const reference = (await referenceRef.get()).data() as
      | { url: string; thumbnailPath?: string | null; thumbnailSource?: string | null }
      | undefined;
    if (!reference) return json({ ok: false, error: "Referência não encontrada." }, 404);
    // Não substitui uma capa enviada pela pessoa.
    if (reference.thumbnailSource === "upload") return json({ ok: true, skipped: "has_upload" });
    const post = getInstagramPost(reference.url);
    if (!post) return json({ ok: false, error: "Não é uma postagem do Instagram." }, 400);

    const triedAt = new Date().toISOString();
    const image = await fetchInstagramImage(post);
    if (!image) {
      // O Instagram não entregou a imagem: marca para não tentar de novo a cada visita.
      await referenceRef.update({ thumbnailTriedAt: triedAt });
      return json({ ok: false, reason: "not_found" });
    }
    let copied: { path: string; url: string };
    try {
      copied = await saveInstagramImage(post, image, projectId, referenceId);
    } catch (error) {
      // Problema ao guardar (ex.: Storage ainda não ativado): NÃO marca a tentativa, para tentar de novo depois.
      console.error("Storage: não foi possível guardar a imagem", (error as Error).message);
      return json({ ok: false, reason: "storage_unavailable" }, 503);
    }
    await referenceRef.update({
      thumbnailUrl: copied.url,
      thumbnailPath: copied.path,
      thumbnailSource: "instagram",
      thumbnailTriedAt: triedAt,
    });
    return json({ ok: true, thumbnailUrl: copied.url });
  } catch (error) {
    console.error("Falha em /api/references/instagram-image", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
