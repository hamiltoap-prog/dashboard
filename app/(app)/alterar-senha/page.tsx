"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translateAuthError } from "@/lib/auth-errors";
import { useAuth } from "@/lib/firebase/auth";
import { changePassword, sendPasswordReset } from "@/lib/firebase/auth-actions";

const MIN_LENGTH = 6;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const hasPassword = user?.providerData.some((p) => p.providerId === "password") ?? false;

  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, password);
      toast.success("Senha atualizada!");
      router.push("/");
    } catch (error) {
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendLink() {
    if (!user?.email) return;
    setLoading(true);
    try {
      await sendPasswordReset(user.email);
      toast.success("Enviamos um e-mail com o link para criar sua senha.");
    } catch (error) {
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>
            {hasPassword
              ? "Informe sua senha atual e escolha a nova."
              : "Sua conta entra com o Google e ainda não tem uma senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password">Senha atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </div>
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
              <p className="text-center text-xs text-muted-foreground">
                Esqueceu a senha atual? Saia e use “Esqueci minha senha” na tela de login.
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <Button onClick={handleSendLink} disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Enviar e-mail para criar uma senha
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Voltar</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
