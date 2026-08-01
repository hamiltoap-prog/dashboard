"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { UserAvatar } from "@/components/user-avatar";
import { useStore } from "@/lib/store";
import type { ActivityEntry } from "@/lib/types";

const ACTION_VERB: Record<ActivityEntry["action"], string> = {
  created: "criou",
  updated: "atualizou",
  deleted: "removeu",
  moved: "moveu",
  commented: "comentou em",
  joined: "entrou em",
};

const ENTITY_LABEL: Record<ActivityEntry["entityType"], string> = {
  project: "projeto",
  card: "card",
  column: "coluna",
  file: "arquivo",
  reference: "referência",
  meeting: "reunião",
};

export function ActivityFeed({
  entries,
  emptyMessage = "Nenhuma atividade ainda.",
}: {
  entries: ActivityEntry[];
  emptyMessage?: string;
}) {
  const { getProfile } = useStore();

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {entries.map((entry) => {
        const profile = getProfile(entry.userId);
        return (
          <li key={entry.id} className="flex items-start gap-3">
            {profile && <UserAvatar profile={profile} className="size-8 shrink-0" />}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm leading-snug">
                <span className="font-medium">{profile?.name ?? "Alguém"}</span>{" "}
                <span className="text-muted-foreground">
                  {ACTION_VERB[entry.action]} {ENTITY_LABEL[entry.entityType]}
                </span>{" "}
                <span className="font-medium">{entry.entityLabel}</span>
              </p>
              {entry.detail && (
                <p className="text-sm text-muted-foreground">{entry.detail}</p>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
