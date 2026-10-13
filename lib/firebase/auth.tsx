"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { FullPageSpinner } from "@/components/full-page-spinner";
import { getFirebase } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

type AuthStatus = "loading" | "signedIn" | "signedOut" | "unconfigured";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [state, setState] = React.useState<AuthContextValue>({
    user: null,
    status: configured ? "loading" : "unconfigured",
  });

  React.useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getFirebase().auth, (user) =>
      setState({ user, status: user ? "signedIn" : "signedOut" })
    );
  }, [configured]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

// Protege as telas do app: sem login, manda para /login (e volta para cá depois).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "signedOut") {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [status, pathname, router]);

  if (status === "unconfigured") return <SetupNotice />;
  if (status !== "signedIn") return <FullPageSpinner />;
  return <>{children}</>;
}

export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-sm">
        <h1 className="mb-2 text-base font-semibold">Firebase não configurado</h1>
        <p className="text-muted-foreground">
          Defina as variáveis <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>,{" "}
          <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>,{" "}
          <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code> e <code>NEXT_PUBLIC_FIREBASE_APP_ID</code>{" "}
          (no <code>.env.local</code> ou na Vercel) e publique de novo. O passo a passo está no
          README.
        </p>
      </div>
    </div>
  );
}
