import { doc, runTransaction, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "@/lib/firebase/client";

export const AVATAR_COLORS = ["#5B8DEF", "#E7A23E", "#4FB286", "#C868D0", "#E2677A", "#5BB8C9", "#8E7CC3"];

function pickColor(uid: string) {
  let hash = 0;
  for (const char of uid) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function profileFor(user: User, nameOverride?: string) {
  const email = (user.email ?? "").toLowerCase();
  return {
    name: nameOverride || user.displayName || email.split("@")[0] || "Sem nome",
    email,
    avatarUrl: user.photoURL ?? null,
    colorHex: pickColor(user.uid),
  };
}

// Grava o perfil público (nome/e-mail/cor) usado para mostrar a pessoa nos projetos.
export async function saveProfile(user: User, name: string) {
  const { db } = getFirebase();
  await setDoc(doc(db, "users", user.uid), {
    ...profileFor(user, name),
    createdAt: new Date().toISOString(),
  });
}

// Garante que existe um perfil (contas criadas pelo Google ou pela migração não passam
// pelo cadastro). Nunca sobrescreve um perfil existente.
export async function ensureProfile(user: User) {
  const { db } = getFirebase();
  const ref = doc(db, "users", user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, { ...profileFor(user), createdAt: new Date().toISOString() });
  });
}
