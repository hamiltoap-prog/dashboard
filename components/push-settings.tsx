"use client";

import * as React from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendNotifyRequest } from "@/lib/notify";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/lib/push";

const EXPLANATION: Partial<Record<PushStatus, string>> = {
  unsupported:
    "Este navegador não permite notificações. No iPhone/iPad, instale o app primeiro (Safari → Compartilhar → Adicionar à Tela de Início) e abra pelo ícone.",
  not_configured: "As notificações ainda não foram configuradas pelo administrador do site.",
  denied:
    "As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e volte aqui.",
};

export function PushSettings() {
  const [status, setStatus] = React.useState<PushStatus | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    getPushStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  async function run(action: () => Promise<PushStatus>) {
    setBusy(true);
    try {
      setStatus(await action());
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível alterar as notificações.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const result = await sendNotifyRequest({ kind: "test" });
      if (result.reason === "not_configured") {
        toast.error("O servidor ainda não tem a chave privada das notificações.");
      } else if (!result.ok) {
        toast.error("O servidor não conseguiu enviar.", {
          description: "Confira os registros do App Hosting e as permissões da conta do servidor no Firestore.",
        });
      } else if (!result.devices) {
        toast.error("Nenhum aparelho seu está registrado. Ative as notificações primeiro.");
      } else {
        toast.success("Teste enviado! A notificação deve aparecer em instantes.");
      }
    } catch {
      toast.error("Não foi possível falar com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>
          Receba um aviso neste aparelho quando atribuírem um card a você, comentarem nos seus cards,
          adicionarem você a um projeto ou marcarem uma reunião.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === null ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : status === "on" ? (
          <>
            <p className="flex items-center gap-2 text-sm">
              <Bell className="size-4 text-primary" /> Ativadas neste aparelho.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={sendTest} disabled={busy}>
                <Send /> Enviar notificação de teste
              </Button>
              <Button variant="ghost" onClick={() => run(disablePush)} disabled={busy}>
                <BellOff /> Desativar neste aparelho
              </Button>
            </div>
          </>
        ) : status === "off" ? (
          <Button className="w-fit" onClick={() => run(enablePush)} disabled={busy}>
            <Bell /> Ativar neste aparelho
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{EXPLANATION[status]}</p>
        )}
        <p className="text-xs text-muted-foreground">
          É por aparelho: ative também no celular e no computador, se quiser nos dois.
        </p>
      </CardContent>
    </Card>
  );
}
