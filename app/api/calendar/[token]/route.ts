import { adminDb } from "@/lib/server/admin";
import { meetingsToIcs } from "@/lib/ics";
import type { Meeting } from "@/lib/types";

// Link de calendário de cada pessoa: /api/calendar/<token>.ics
// Google Agenda, Apple Calendar e Outlook "assinam" este endereço e passam a mostrar as reuniões
// (inclusive as recorrentes) de TODOS os projetos da pessoa. O token é secreto: quem tem o link vê as
// reuniões, então ele pode ser trocado a qualquer momento no Perfil.

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "");
  if (!TOKEN.test(token)) return new Response("Não encontrado", { status: 404 });

  const db = adminDb();
  const owner = await db.collection("userSecrets").where("calendarToken", "==", token).limit(1).get();
  if (owner.empty) return new Response("Não encontrado", { status: 404 });
  const uid = owner.docs[0].id;

  const projects = await db.collection("projects").where("memberIds", "array-contains", uid).get();
  const meetings: Meeting[] = [];
  await Promise.all(
    projects.docs.map(async (project) => {
      const name = project.data().name as string;
      const snapshot = await project.ref.collection("meetings").get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        meetings.push({
          id: doc.id,
          ...data,
          title: `${name} · ${data.title}`,
          attendeeIds: data.attendeeIds ?? [],
          exceptions: data.exceptions ?? [],
        } as Meeting);
      }
    })
  );

  return new Response(meetingsToIcs(meetings, "Palco"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="palco.ics"',
      "Cache-Control": "private, no-cache, must-revalidate",
    },
  });
}
