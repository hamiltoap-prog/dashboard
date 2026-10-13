"use client";

import * as React from "react";
import { Download, Share, SquarePlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// Evento que o Chrome/Edge/Android disparam quando o app pode ser instalado.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  // Registrado já na carga do módulo: o evento pode disparar antes de qualquer componente montar.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const noopSubscribe = () => () => {};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Registra o service worker (só em produção, para não atrapalhar o desenvolvimento).
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Falha ao registrar o service worker", error));
  }, []);
  return null;
}

// Item do menu do avatar. Só aparece quando faz sentido: app instalável (Chrome/Android) ou iPhone/iPad.
export function InstallAppMenuItem() {
  const canPrompt = React.useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false
  );
  const ios = React.useSyncExternalStore(noopSubscribe, isIos, () => false);
  const standalone = React.useSyncExternalStore(noopSubscribe, isStandalone, () => true);
  const [help, setHelp] = React.useState(false);

  if (standalone || (!canPrompt && !ios)) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      const event = deferredPrompt;
      deferredPrompt = null;
      notify();
      await event.prompt();
      await event.userChoice;
    } else {
      setHelp(true);
    }
  }

  return (
    <>
      <DropdownMenuItem onSelect={handleInstall}>
        <Download />
        Instalar app
      </DropdownMenuItem>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar o Palco no iPhone / iPad</DialogTitle>
            <DialogDescription>
              No Safari, o Palco vira um app na tela inicial, com ícone próprio e em tela cheia.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3">
              <Share className="size-5 shrink-0 text-primary" />
              <span>
                Toque no botão <strong>Compartilhar</strong> do Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <SquarePlus className="size-5 shrink-0 text-primary" />
              <span>
                Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Precisa ser no Safari (em outros navegadores do iPhone a opção não aparece).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
