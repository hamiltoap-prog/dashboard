import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase/client";

// Link secreto do calendário da pessoa (ver app/api/calendar/[token]/route.ts).
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const secretRef = () => {
  const { db, auth } = getFirebase();
  return doc(db, "userSecrets", auth.currentUser?.uid ?? "_");
};

export async function getCalendarToken(): Promise<string | null> {
  const snap = await getDoc(secretRef());
  return (snap.data()?.calendarToken as string | undefined) ?? null;
}

// Cria um link novo; o anterior (se existia) deixa de funcionar.
export async function renewCalendarToken(): Promise<string> {
  const token = randomToken();
  await setDoc(secretRef(), { calendarToken: token, createdAt: new Date().toISOString() });
  return token;
}

export async function revokeCalendarToken() {
  await deleteDoc(secretRef());
}

export const calendarFeedUrl = (token: string) => `${window.location.origin}/api/calendar/${token}.ics`;
