import "server-only";

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Acesso de administrador ao Firebase, só no servidor. No App Hosting as credenciais vêm da
// conta de serviço do próprio backend (Application Default Credentials), sem chaves no código.
// Com os emuladores (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST) funciona sem credenciais.
function app() {
  return (
    getApps()[0] ??
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined })
  );
}

export const adminDb = () => getFirestore(app());
export const adminAuth = () => getAuth(app());
export const adminBucket = () => getStorage(app()).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined);

// Quem está chamando? Lê o "Bearer <ID token>" enviado pelo app e confere com o Firebase Auth.
export async function requireUser(request: Request): Promise<{ uid: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
