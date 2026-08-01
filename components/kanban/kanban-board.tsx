"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { CardDetailDialog } from "@/components/kanban/card-detail-dialog";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { useStore } from "@/lib/store";
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from "@/lib/types";

export function KanbanBoard({
  projectId,
  columns,
  cards,
}: {
  projectId: string;
  columns: KanbanColumnType[];
  cards: KanbanCardType[];
}) {
  const { moveCard, addCard } = useStore();
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<KanbanCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const cardsByColumn = React.useMemo(() => {
    const map = new Map<string, KanbanCardType[]>();
    for (const column of columns) {
      map.set(
        column.id,
        cards.filter((c) => c.columnId === column.id).sort((a, b) => a.position - b.position)
      );
    }
    return map;
  }, [columns, cards]);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const overColumn = columns.find((c) => c.id === overId);

    if (overColumn) {
      moveCard(String(active.id), overColumn.id, cardsByColumn.get(overColumn.id)?.length ?? 0);
      return;
    }

    for (const column of columns) {
      const list = cardsByColumn.get(column.id) ?? [];
      const index = list.findIndex((c) => c.id === overId);
      if (index >= 0) {
        moveCard(String(active.id), column.id, index);
        return;
      }
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn.get(column.id) ?? []}
              onCardClick={setSelectedCard}
              onAddCard={(title) =>
                addCard({ projectId, columnId: column.id, title })
              }
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={selectedCard}
        onOpenChange={(open) => !open && setSelectedCard(null)}
      />
    </>
  );
}
