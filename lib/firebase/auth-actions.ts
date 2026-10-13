import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { getFirebase } from "@/lib/firebase/client";
import { saveProfile } from "@/lib/firebase/profile";

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(getFirebase().auth, email, password);
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { auth } = getFirebase();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await saveProfile(credential.user, name);
}

export async function signInWithGoogle() {
  await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
}

// O Firebase envia o e-mail com um link para a página de redefinição dele; depois de salvar
// a nova senha, a pessoa pode voltar ao app pelo botão "Continuar" (que leva ao login).
export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(getFirebase().auth, email, {
    url: `${window.location.origin}/login`,
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = getFirebase().auth.currentUser;
  if (!user?.email) throw new Error("Você precisa estar logado.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export async function signOutUser() {
  await signOut(getFirebase().auth);
}
