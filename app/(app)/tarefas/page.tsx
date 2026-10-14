"use client";

import * as React from "react";
import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { dueDateOf, isOverdue } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { KanbanCard } from "@/lib/types";

type GroupKey = "atrasadas" | "hoje" | "semana" | "depois" | "sem_prazo";

const GROUPS: { key: GroupKey; title: string }[] = [
  { key: "atrasadas", title: "Atrasadas" },
  { key: "hoje", title: "Hoje" },
  { key: "semana", title: "Próximos 7 dias" },
  { key: "depois", title: "Mais tarde" },
  { key: "sem_prazo", title: "Sem prazo" },
];

const DONE_COLUMN = /^(conclu[ií]d[oa]s?|feit[oa]s?|finalizad[oa]s?)$/i;

function groupOf(card: KanbanCard, now: Date): GroupKey {
  if (!card.dueDate) return "sem_prazo";
  if (isOverdue(card.dueDate, now)) return "atrasadas";
  const due = startOfDay(dueDateOf(card.dueDate));
  const today = startOfDay(now);
  if (due.getTime() === today.getTime()) return "hoje";
  if (due <= addDays(today, 7)) return "semana";
  return "depois";
}

export default function MyTasksPage() {
  const { cards, columns, projects, currentUser } = useStore();
  const [showDone, setShowDone] = React.useState(false);

  const now = new Date();
  const columnById = new Map(columns.map((c) => [c.id, c]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const mine = cards.filter((c) => c.assigneeIds.includes(currentUser.id));
  const isDone = (card: KanbanCard) => DONE_COLUMN.test(columnById.get(card.columnId)?.name ?? "");
  const doneCount = mine.filter(isDone).length;
  const visible = mine
    .filter((c) => showDone || !isDone(c))
    .sort((a, b) =>
      a.dueDate && b.dueDate
        ? dueDateOf(a.dueDate).getTime() - dueDateOf(b.dueDate).getTime()
        : a.dueDate
          ? -1
          : b.dueDate
            ? 1
            : a.title.localeCompare(b.title)
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas tarefas</h1>
          <p className="text-sm text-muted-foreground">
            Cards em que você é responsável, em todos os projetos.
          </p>
        </div>
        {doneCount > 0 && (
          <div className="flex items-center gap-2">
            <Switch id="show-done" checked={showDone} onCheckedChange={setShowDone} />
            <Label htmlFor="show-done" className="text-sm text-muted-foreground">
              Mostrar concluídas ({doneCount})
            </Label>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
          <CheckCircle2 className="size-8 text-muted-foreground" />
          <p className="font-medium">Nada pendente para você</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Quando alguém atribuir um card a você (ou você mesmo, ao editar o card), ele aparece aqui.
          </p>
        </div>
      ) : (
        GROUPS.map(({ key, title }) => {
          const items = visible.filter((c) => groupOf(c, now) === key);
          if (items.length === 0) return null;
          return (
            <section key={key} className="flex flex-col gap-2">
              <h2
                className={cn(
                  "text-sm font-semibold",
                  key === "atrasadas" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {title} · {items.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((card) => {
                  const project = projectById.get(card.projectId);
                  if (!project) return null;
                  return (
                    <li key={card.id}>
                      <Link
                        href={`/projects/${project.slug}/kanban`}
                        className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 outline-none transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-sm font-medium leading-snug wrap-anywhere">{card.title}</span>
                          {card.dueDate && (
                            <span
                              className={cn(
                                "shrink-0 text-xs",
                                key === "atrasadas" ? "text-destructive" : "text-muted-foreground"
                              )}
                            >
                              {format(dueDateOf(card.dueDate), "d MMM", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground wrap-anywhere">{project.name}</span>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="min-w-0 wrap-anywhere">{columnById.get(card.columnId)?.name}</span>
                          {card.labels.map((label) => (
                            <Badge key={label} variant="default" className="max-w-full truncate px-2 py-0 text-[11px]">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
