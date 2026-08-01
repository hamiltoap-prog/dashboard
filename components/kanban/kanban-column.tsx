"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from "@/lib/types";

export function KanbanColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
}: {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState("");

  function submit() {
    const trimmed = title.trim();
    if (trimmed) onAddCard(trimmed);
    setTitle("");
    setAdding(false);
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-3 sm:w-[300px]">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-1 flex-col gap-2 rounded-2xl border border-transparent p-1.5 transition-colors ${
          isOver ? "border-primary/30 bg-primary/5" : ""
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {adding ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
            <Textarea
              autoFocus
              placeholder="Título do card"
              value={title}
              rows={2}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              className="border-none p-1 shadow-none focus-visible:ring-0"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submit}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus />
            Adicionar card
          </Button>
        )}
      </div>
    </div>
  );
}
