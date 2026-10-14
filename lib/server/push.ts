import "server-only";

import webpush from "web-push";

import { adminDb } from "@/lib/server/admin";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// PUSH_DRY_RUN=1 (só para testes): não envia nada, apenas devolve o que seria enviado.
const dryRun = () => process.env.PUSH_DRY_RUN === "1";

interface StoredDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushResult {
  devices: number;
  sent: number;
  removed: number;
  failed: number;
  dryRunPayloads?: { userId: string; payload: PushPayload }[];
}

// Envia para todos os aparelhos das pessoas indicadas. Aparelhos que não existem mais (404/410)
// são apagados da lista.
export async function sendPush(
  userIds: string[],
  payload: PushPayload,
  subject: string
): Promise<PushResult> {
  const result: PushResult = { devices: 0, sent: 0, removed: 0, failed: 0 };
  if (dryRun()) result.dryRunPayloads = [];
  if (!pushConfigured() || userIds.length === 0) return result;

  webpush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  const db = adminDb();
  const body = JSON.stringify(payload);

  for (const userId of userIds) {
    const snapshot = await db.collection("users").doc(userId).collection("devices").get();
    for (const doc of snapshot.docs) {
      const device = doc.data() as Partial<StoredDevice>;
      if (!device.endpoint || !device.keys?.p256dh || !device.keys?.auth) continue;
      result.devices++;
      if (dryRun()) {
        result.sent++;
        result.dryRunPayloads?.push({ userId, payload });
        continue;
      }
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: device.keys },
          body,
          { TTL: 60 * 60 * 24, urgency: "normal" }
        );
        result.sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await doc.ref.delete().catch(() => {});
          result.removed++;
        } else {
          console.error("Falha ao enviar notificação", status, (error as Error).message);
          result.failed++;
        }
      }
    }
  }
  return result;
}
