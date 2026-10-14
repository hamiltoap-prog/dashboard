"use client";

import * as React from "react";
import { CalendarSync, Copy, ExternalLink, Loader2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  calendarFeedUrl,
  getCalendarToken,
  renewCalendarToken,
  revokeCalendarToken,
} from "@/lib/calendar-feed";

export function CalendarFeedSettings() {
  const [token, setToken] = React.useState<string | null | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    getCalendarToken()
      .then((t) => alive && setToken(t))
      .catch(() => alive && setToken(null));
    return () => {
      alive = false;
    };
  }, []);

  async function run(action: () => Promise<string | null>, message: string) {
    setBusy(true);
    try {
      setToken(await action());
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível alterar o link do calendário.");
    } finally {
      setBusy(false);
    }
  }

  const url = token ? calendarFeedUrl(token) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário no Google Agenda / Apple</CardTitle>
        <CardDescription>
          Um link só seu que mostra as reuniões de todos os seus projetos (inclusive as recorrentes) no
          seu calendário, e se atualiza sozinho.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {token === undefined ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : token === null ? (
          <Button
            className="w-fit"
            disabled={busy}
            onClick={() => run(renewCalendarToken, "Link criado")}
          >
            <CalendarSync /> Gerar meu link de calendário
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Link do calendário" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="secondary" size="icon" onClick={copy} aria-label="Copiar link">
                <Copy />
              </Button>
            </div>

            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Google Agenda</strong> (no computador): clique em{" "}
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Adicionar agenda → Do URL <ExternalLink className="size-3" />
                </a>{" "}
                e cole o link. Ele também aparece no app do celular.
              </li>
              <li>
                <strong className="text-foreground">Apple Calendar / iPhone:</strong>{" "}
                <a href={url.replace(/^https?:/, "webcal:")} className="text-primary hover:underline">
                  toque aqui para assinar
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">Outlook:</strong> Adicionar calendário → Assinar da web.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              O Google atualiza agendas assinadas só de tempos em tempos (de poucas horas até cerca de 1 dia):
              uma reunião nova pode demorar a aparecer lá. Para avisos na hora, use as notificações.
              Quem tiver este link vê as suas reuniões; se ele vazar, gere outro.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Gerar um link novo? O link atual (e as agendas que o usam) deixam de funcionar.")) {
                    run(renewCalendarToken, "Novo link criado. Atualize nas suas agendas.");
                  }
                }}
              >
                <RefreshCw /> Gerar novo link
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Desativar o link do calendário?")) {
                    run(async () => {
                      await revokeCalendarToken();
                      return null;
                    }, "Link desativado");
                  }
                }}
              >
                <Unlink /> Desativar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
