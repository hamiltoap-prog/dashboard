import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebase } from "@/lib/firebase/client";

// Imagens de capa das referências, guardadas no Firebase Storage em
// projects/{projectId}/references/{referenceId}/{arquivo}.jpg

const MAX_SIDE = 1600; // px no lado maior: suficiente para tela cheia, leve para o celular
const QUALITY = 0.85;

// Reduz e converte para JPEG no próprio aparelho (fotos de celular chegam a 5–10 MB).
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#fff"; // PNG transparente vira fundo branco no JPEG
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // formato que o navegador não decodifica: envia como veio
  }
}

export async function uploadReferenceImage(projectId: string, referenceId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const blob = await compress(file);
  if (blob.size > 8 * 1024 * 1024) throw new Error("Imagem grande demais (máximo 8 MB).");
  const { storage } = getFirebase();
  const path = `projects/${projectId}/references/${referenceId}/${crypto.randomUUID()}.jpg`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, blob, { contentType: blob.type || "image/jpeg", cacheControl: "public, max-age=31536000" });
  return { path, url: await getDownloadURL(objectRef) };
}

export function deleteReferenceImage(path: string) {
  const { storage } = getFirebase();
  deleteObject(ref(storage, path)).catch(() => {
    // se já não existir, tudo bem
  });
}
