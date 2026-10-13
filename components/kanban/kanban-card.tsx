"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Clock, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { dueDateOf, isOverdue } from "@/lib/dates";
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
  const { getProfile, comments } = useStore();
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

  const overdue = isOverdue(card.dueDate);
  const commentCount = comments.filter((c) => c.cardId === card.id).length;
  const checklistDone = card.checklist.filter((i) => i.done).length;
  const hasFooter =
    Boolean(card.dueDate) || assignees.length > 0 || card.checklist.length > 0 || commentCount > 0;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
      className={cn(
        "flex w-full touch-manipulation select-none flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow [-webkit-touch-callout:none]",
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

      {hasFooter && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {card.dueDate && (
              <span
                className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}
              >
                <Clock className="size-3" />
                {format(dueDateOf(card.dueDate), "d MMM", { locale: ptBR })}
              </span>
            )}
            {card.checklist.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  checklistDone === card.checklist.length && "text-emerald-600 dark:text-emerald-400"
                )}
                title="Checklist"
              >
                <CheckSquare className="size-3" />
                {checklistDone}/{card.checklist.length}
              </span>
            )}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1" title="Comentários">
                <MessageSquare className="size-3" />
                {commentCount}
              </span>
            )}
          </div>
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
