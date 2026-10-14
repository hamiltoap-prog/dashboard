import { getFirebase } from "@/lib/firebase/client";

// Pede ao servidor para buscar a imagem do post do Instagram e salvá-la como capa da referência.
// Quando dá certo, o Firestore atualiza a tela sozinho (a capa aparece no card).

// Uma vez por referência nesta sessão (a página e o diálogo de adicionar podem pedir ao mesmo tempo).
const attempted = new Set<string>();
// A referência acabou de ser criada: o servidor pode ainda não enxergá-la. Tenta de novo nesses casos.
const RETRY_DELAYS_MS = [0, 1500, 3000, 6000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function requestInstagramImage(projectId: string, referenceId: string) {
  if (attempted.has(referenceId)) return { ok: false, reason: "already_requested" };
  attempted.add(referenceId);
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const token = await getFirebase().auth.currentUser?.getIdToken();
      if (!token) return { ok: false };
      const response = await fetch("/api/references/instagram-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, referenceId }),
      });
      if (response.status === 404) continue;
      return (await response.json()) as { ok: boolean; reason?: string; thumbnailUrl?: string };
    } catch {
      // sem conexão: tenta de novo
    }
  }
  return { ok: false, reason: "gave_up" };
}
