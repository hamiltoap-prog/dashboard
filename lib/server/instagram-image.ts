import "server-only";

import { randomUUID } from "node:crypto";

import { adminBucket } from "@/lib/server/admin";
import { instagramEmbedUrl, type InstagramPost } from "@/lib/instagram";

// Busca a imagem de uma postagem PÚBLICA do Instagram e guarda uma cópia no Storage.
// A Meta não fornece mais a capa pelo oEmbed (nov/2025) e recomenda ler os metadados da própria
// postagem. Os links de imagem do Instagram expiram em poucos dias, por isso guardamos uma cópia.

// INSTAGRAM_BASE_URL existe só para os testes (servidor simulado); em produção é o Instagram.
const BASE = (process.env.INSTAGRAM_BASE_URL || "https://www.instagram.com").replace(/\/+$/, "");
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
// O Instagram entrega as tags og:* para robôs de pré-visualização de links.
const PREVIEW_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

// Proteção: o servidor só baixa imagens dos servidores de imagem do Instagram/Facebook.
function isAllowedImageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (process.env.INSTAGRAM_BASE_URL && url.origin === new URL(BASE).origin) return true;
    return url.protocol === "https:" && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

const decodeHtml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&").replace(/&quot;/g, '"').replace(/&#x2F;/gi, "/");
const decodeJson = (s: string) => {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s.replace(/\\\//g, "/").replace(/\\u0026/g, "&");
  }
};

// Procura o endereço da imagem no HTML (o formato do Instagram muda de tempos em tempos).
export function findImageUrl(html: string): string | null {
  const candidates: string[] = [];
  // 1) página de embed: <img class="EmbeddedMediaImage" src="...">
  for (const tag of html.match(/<img\b[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/gi) ?? []) {
    const src = /\ssrc="([^"]+)"/i.exec(tag)?.[1];
    if (src) candidates.push(decodeHtml(src));
  }
  // 2) dados da postagem embutidos em JSON: "display_url":"https:\/\/..."
  for (const m of html.matchAll(/"(?:display_url|display_src|thumbnail_src)"\s*:\s*"((?:[^"\\]|\\.)+)"/g)) {
    candidates.push(decodeJson(m[1]));
  }
  // 3) metadados de pré-visualização: <meta property="og:image" content="...">
  for (const tag of html.match(/<meta\b[^>]*(?:property|name)="og:image"[^>]*>/gi) ?? []) {
    const content = /\scontent="([^"]+)"/i.exec(tag)?.[1];
    if (content) candidates.push(decodeHtml(content));
  }
  return candidates.find(isAllowedImageUrl) ?? null;
}

async function fetchText(url: string, userAgent: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8", Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Instagram respondeu ${response.status}`);
  // Redirecionamentos só valem se terminarem no próprio Instagram (ex.: não segue para outro site).
  const finalHost = new URL(response.url || url).hostname;
  const allowedHost = process.env.INSTAGRAM_BASE_URL ? new URL(BASE).hostname : "www.instagram.com";
  if (finalHost !== allowedHost && !/(^|\.)instagram\.com$/i.test(finalHost)) {
    throw new Error(`Redirecionado para fora do Instagram (${finalHost})`);
  }
  return response.text();
}

async function locateImage(post: InstagramPost): Promise<string | null> {
  const embedPath = instagramEmbedUrl(post).replace("https://www.instagram.com", "");
  const attempts: [string, string][] = [
    [`${BASE}${embedPath}`, BROWSER_UA],
    [`${BASE}/${post.kind}/${post.code}/`, PREVIEW_UA],
  ];
  for (const [url, ua] of attempts) {
    try {
      const found = findImageUrl(await fetchText(url, ua));
      if (found) return found;
    } catch (error) {
      console.warn("Instagram: tentativa falhou", url, (error as Error).message);
    }
  }
  return null;
}

async function download(url: string) {
  if (!isAllowedImageUrl(url)) throw new Error("Endereço de imagem não permitido.");
  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
    redirect: "error", // não segue redirecionamentos: a imagem precisa vir do endereço conferido acima
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) throw new Error(`Imagem indisponível (${response.status} ${type})`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("Imagem grande demais.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES || bytes.length < 200) throw new Error("Imagem inválida.");
  return { bytes, type: type.split(";")[0] };
}

// URL pública com token (o mesmo formato do getDownloadURL do SDK web).
function downloadUrl(bucket: string, path: string, token: string) {
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = emulator ? `http://${emulator}` : "https://firebasestorage.googleapis.com";
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

// 1ª etapa: achar e baixar a imagem no Instagram. null = o Instagram não entregou (privado, apagado...).
export async function fetchInstagramImage(post: InstagramPost) {
  const imageUrl = await locateImage(post);
  if (!imageUrl) return null;
  try {
    return await download(imageUrl);
  } catch (error) {
    console.warn("Instagram: download recusado", post.code, (error as Error).message);
    return null;
  }
}

// 2ª etapa: guardar a cópia no Storage (falha aqui = problema nosso, ex.: Storage ainda não ativado).
export async function saveInstagramImage(
  post: InstagramPost,
  image: { bytes: Buffer; type: string },
  projectId: string,
  referenceId: string
) {
  const { bytes, type } = image;
  const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `projects/${projectId}/references/${referenceId}/instagram-${post.code}.${extension}`;
  const token = randomUUID();
  const bucket = adminBucket();
  await bucket.file(path).save(bytes, {
    contentType: type,
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } },
  });
  return { path, url: downloadUrl(bucket.name, path, token) };
}
