"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { KanbanCard as KanbanCardType } from "@/lib/types";

export function KanbanCard({
  card,
  onClick,
  overlay = false,
}: {
  card: KanbanCardType;
  onClick?: () => void;
  overlay?: boolean;
}) {
  const { getProfile } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignees = card.assigneeIds
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const overdue = card.dueDate ? isPast(new Date(card.dueDate)) : false;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-1 shadow-lg"
      )}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <Badge key={label} variant="default" className="px-2 py-0 text-[11px]">
              {label}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-sm font-medium leading-snug">{card.title}</p>

      {(card.dueDate || assignees.length > 0) && (
        <div className="flex items-center justify-between pt-0.5">
          {card.dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Clock className="size-3" />
              {format(new Date(card.dueDate), "d MMM", { locale: ptBR })}
            </span>
          ) : (
            <span />
          )}
          <div className="flex -space-x-1.5">
            {assignees.map((a) => (
              <UserAvatar key={a.id} profile={a} className="size-5 text-[9px]" />
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
