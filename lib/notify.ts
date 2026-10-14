import { getFirebase } from "@/lib/firebase/client";

// Pede ao servidor para avisar outras pessoas (notificação no aparelho). Fica em segundo plano:
// se falhar ou se as notificações não estiverem configuradas, o app segue normalmente.
export type NotifyEvent =
  | { kind: "assigned"; projectId: string; cardId: string; targetUserIds: string[] }
  | { kind: "comment"; projectId: string; cardId: string; commentId: string }
  | { kind: "member_added"; projectId: string; targetUserId: string }
  | { kind: "meeting"; projectId: string; meetingId: string };

export const pushEnabledInApp = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export async function sendNotifyRequest(event: NotifyEvent | { kind: "test" }) {
  const token = await getFirebase().auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sem login.");
  const response = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(event),
  });
  return (await response.json()) as {
    ok: boolean;
    reason?: string;
    error?: string;
    sent?: number;
    devices?: number;
  };
}

export function notify(event: NotifyEvent) {
  if (!pushEnabledInApp()) return;
  sendNotifyRequest(event).catch(() => {});
}
