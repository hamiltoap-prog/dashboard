import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

// Só aceita caminhos internos, para o parâmetro `next` não virar um redirecionamento aberto.
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

// Destino dos links enviados por e-mail (recuperação de senha, confirmação de conta).
// Suporta o fluxo PKCE (?code=...) e o fluxo por token (?token_hash=...&type=...).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const loginWithError = (code: string) =>
    NextResponse.redirect(new URL(`/login?error=${code}`, request.url));

  if (!isSupabaseConfigured()) return loginWithError("link");
  if (searchParams.get("error")) return loginWithError("link");

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: unknown = new Error("missing code");
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  }

  if (error) return loginWithError("link");
  return NextResponse.redirect(new URL(next, request.url));
}
