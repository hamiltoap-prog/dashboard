"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Drama, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { translateAuthError } from "@/lib/auth-errors";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = isSupabaseConfigured();

  const [mode, setMode] = React.useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [resetSent, setResetSent] = React.useState(false);
  const linkError = searchParams.get("error");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.info("Modo demo ativo", {
        description: "Conecte um projeto Supabase (veja o README) para ativar contas reais.",
      });
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } else if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(searchParams.get("next") || "/");
        router.refresh();
      }
    } catch (error) {
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Drama className="size-5" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Palco</h1>
        <p className="text-sm text-muted-foreground">Dashboard de projetos de teatro</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          {!configured && (
            <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              Modo demo: o dashboard já funciona com dados de exemplo, sem precisar entrar.{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                Continuar em modo demo →
              </Link>
            </div>
          )}

          {linkError && (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              Esse link é inválido ou expirou. Peça um novo em “Esqueci minha senha” e abra o
              e-mail no mesmo navegador/aparelho em que fez o pedido.
            </div>
          )}

          {mode === "forgot" && resetSent ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">Verifique seu e-mail</p>
              <p className="text-muted-foreground">
                Se existir uma conta com <span className="text-foreground">{email}</span>, enviamos
                um link para você criar uma nova senha. Abra-o no mesmo navegador em que fez o
                pedido. Se não chegar em alguns minutos, olhe o spam.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("sign-in");
                  setResetSent(false);
                }}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "forgot" && (
              <p className="text-sm text-muted-foreground">
                Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
              </p>
            )}
            {mode === "sign-up" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== "forgot" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setMode("forgot")}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            )}

            <Button type="submit" disabled={loading} className="mt-1">
              {loading && <Loader2 className="animate-spin" />}
              {mode === "sign-up" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"}
            </Button>
          </form>
          )}

          {!(mode === "forgot" && resetSent) && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === "sign-up" ? "Já tem conta?" : mode === "forgot" ? "Lembrou a senha?" : "Ainda não tem conta?"}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              >
                {mode === "sign-in" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
