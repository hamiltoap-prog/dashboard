"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drama, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FullPageSpinner } from "@/components/full-page-spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUserCancelledAuth, translateAuthError } from "@/lib/auth-errors";
import { SetupNotice, useAuth } from "@/lib/firebase/auth";
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth-actions";

type Mode = "sign-in" | "sign-up" | "forgot";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      <LoginScreen />
    </React.Suspense>
  );
}

// Só aceita caminhos internos, para o `next` não virar um redirecionamento para outro site.
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();

  const [mode, setMode] = React.useState<Mode>("sign-in");
  const [resetSent, setResetSent] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (status === "signedIn") router.replace(safeNext(searchParams.get("next")));
  }, [status, router, searchParams]);

  if (status === "unconfigured") return <SetupNotice />;
  if (status !== "signedOut") return <FullPageSpinner />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        await sendPasswordReset(email.trim());
        setResetSent(true);
      } else if (mode === "sign-up") {
        await signUpWithEmail(name.trim(), email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (error) {
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (!isUserCancelledAuth(error)) toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setResetSent(false);
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
          {mode === "forgot" && resetSent ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">Verifique seu e-mail</p>
              <p className="text-muted-foreground">
                Se existir uma conta com <span className="text-foreground">{email}</span>, enviamos
                um link para você criar uma nova senha. Se não chegar em alguns minutos, olhe o
                spam.
              </p>
              <Button type="button" variant="outline" onClick={() => switchMode("sign-in")}>
                Voltar para o login
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading}>
                    <GoogleIcon />
                    Continuar com Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    ou
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === "forgot" && (
                  <p className="text-sm text-muted-foreground">
                    Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
                  </p>
                )}
                {mode === "sign-up" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
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
                          onClick={() => switchMode("forgot")}
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
                  {mode === "sign-up"
                    ? "Criar conta"
                    : mode === "forgot"
                      ? "Enviar link"
                      : "Entrar"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "sign-in"
                  ? "Ainda não tem conta?"
                  : mode === "sign-up"
                    ? "Já tem conta?"
                    : "Lembrou a senha?"}{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                >
                  {mode === "sign-in" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
