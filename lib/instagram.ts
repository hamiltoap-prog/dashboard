// Postagens do Instagram: desde nov/2025 a Meta não fornece mais a imagem de capa (thumbnail) das
// postagens para outros sites. O caminho oficial e sem chave é o "embed" (o mesmo que blogs usam),
// que mostra a postagem real — foto, carrossel ou reel — dentro de um iframe.

export type InstagramKind = "p" | "reel" | "tv";

export interface InstagramPost {
  kind: InstagramKind;
  code: string;
}

// Aceita instagram.com/p/CODE, /reel/CODE, /reels/CODE, /tv/CODE e /usuario/p/CODE (com ou sem www/m.).
export function getInstagramPost(url: string): InstagramPost | null {
  try {
    const { hostname, pathname } = new URL(url.trim());
    if (!/(^|\.)instagram\.com$/i.test(hostname) && hostname.toLowerCase() !== "instagr.am") return null;
    const match = /^\/(?:[A-Za-z0-9._]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]{5,})/.exec(pathname);
    if (!match) return null;
    const kind = (match[1] === "reels" ? "reel" : match[1]) as InstagramKind;
    return { kind, code: match[2] };
  } catch {
    return null;
  }
}

export function instagramEmbedUrl(post: InstagramPost, captioned = false) {
  return `https://www.instagram.com/${post.kind}/${post.code}/embed/${captioned ? "captioned/" : ""}`;
}
