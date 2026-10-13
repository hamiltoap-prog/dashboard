"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drama, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { translateAuthError } from "@/lib/auth-errors";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const MIN_LENGTH = 6;

export default function ResetPasswordPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  // null = verificando se o link do e-mail gerou uma sessão válida
  const [hasSession, setHasSession] = React.useState<boolean | null>(configured ? null : false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient().auth.getUser();
      if (!cancelled) setHasSession(Boolean(data.user));
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      router.push("/");
      router.refresh();
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
        <h1 className="text-lg font-semibold tracking-tight">Nova senha</h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          {hasSession === null && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasSession === false && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">
                {configured ? "Link inválido ou expirado" : "Modo demo"}
              </p>
              <p className="text-muted-foreground">
                {configured
                  ? "Peça um novo link em “Esqueci minha senha” e abra o e-mail no mesmo navegador/aparelho em que fez o pedido."
                  : "A recuperação de senha só funciona com o Supabase configurado."}
              </p>
              <Button asChild>
                <Link href="/login">Ir para o login</Link>
              </Button>
            </div>
          )}

          {hasSession && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Mínimo de {MIN_LENGTH} caracteres.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
