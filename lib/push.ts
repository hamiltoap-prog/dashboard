import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase/client";

// Notificações push (Web Push) neste aparelho.
export type PushStatus =
  | "unsupported" // navegador não suporta (ex.: iPhone sem o app instalado na tela inicial)
  | "not_configured" // o administrador ainda não colocou a chave VAPID
  | "denied" // o usuário bloqueou nas configurações do navegador
  | "off" // pode ativar
  | "on"; // ativo neste aparelho

const vapidKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function deviceId(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!vapidKey()) return "not_configured";
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey()),
    }));

  const json = subscription.toJSON();
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid || !json.endpoint || !json.keys) throw new Error("Não foi possível registrar este aparelho.");
  await setDoc(doc(db, "users", uid, "devices", await deviceId(json.endpoint)), {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent.slice(0, 200),
    createdAt: new Date().toISOString(),
  });
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    if (uid) await deleteDoc(doc(db, "users", uid, "devices", await deviceId(subscription.endpoint))).catch(() => {});
    await subscription.unsubscribe();
  }
  return "off";
}

export async function countMyDevices(): Promise<number> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  return (await getDocs(collection(db, "users", uid, "devices"))).size;
}
