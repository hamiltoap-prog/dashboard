import type { NextConfig } from "next";

// No Firebase App Hosting, a configuração do app Web chega pronta na variável
// FIREBASE_WEBAPP_CONFIG (durante o build). Aqui ela é repassada ao navegador, assim não é
// preciso copiar chaves à mão. Variáveis NEXT_PUBLIC_FIREBASE_* definidas manualmente
// (uso local, Vercel...) têm prioridade.
function webAppConfigFromFirebase(): Record<string, string | undefined> {
  try {
    return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG ?? "{}");
  } catch {
    return {};
  }
}

const firebase = webAppConfigFromFirebase();

const firebaseEnv = Object.fromEntries(
  Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? firebase.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? firebase.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? firebase.projectId,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? firebase.appId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? firebase.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? firebase.messagingSenderId,
  }).filter(([, value]) => Boolean(value))
) as Record<string, string>;

const nextConfig: NextConfig = {
  env: firebaseEnv,
  async headers() {
    return [
      {
        // O service worker nunca pode ficar preso no cache, senão as atualizações do app não chegam.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
