const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|avif|heic|bmp|svg)(\?.*)?$/i;

// Hosts que servem o binário da imagem diretamente, mesmo sem extensão na URL.
const DIRECT_IMAGE_HOSTS = [
  "images.unsplash.com",
  "i.pinimg.com",
  "pbs.twimg.com",
  "i.imgur.com",
  "cdninstagram.com",
  "fbcdn.net",
  "picsum.photos",
];

export function looksLikeDirectImageUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (IMAGE_EXTENSION_RE.test(pathname)) return true;
    return DIRECT_IMAGE_HOSTS.some((host) => hostname.endsWith(host));
  } catch {
    return false;
  }
}

const SOURCE_BY_HOST: { match: (host: string) => boolean; label: string }[] = [
  { match: (h) => h.includes("instagram.com"), label: "Instagram" },
  { match: (h) => h.includes("pinterest."), label: "Pinterest" },
  { match: (h) => h.includes("tiktok.com"), label: "TikTok" },
  { match: (h) => h.includes("twitter.com") || h === "x.com", label: "X / Twitter" },
  { match: (h) => h.includes("facebook.com"), label: "Facebook" },
];

export function guessSourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const match = SOURCE_BY_HOST.find((entry) => entry.match(hostname));
    return match?.label ?? hostname;
  } catch {
    return "Link";
  }
}
