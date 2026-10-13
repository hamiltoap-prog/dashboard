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
import {
  KanbanFiltersBar,
  NO_FILTERS,
  type KanbanFilters,
} from "@/components/kanban/kanban-filters";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { NewColumn } from "@/components/kanban/new-column";
import { isOverdue } from "@/lib/dates";
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
  const { moveCard, addCard, addColumn, projects, getProfile, currentUser } = useStore();
  const [filters, setFilters] = React.useState<KanbanFilters>(NO_FILTERS);
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<KanbanCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const members = (projects.find((p) => p.id === projectId)?.memberIds ?? [])
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const allLabels = React.useMemo(
    () => [...new Set(cards.flatMap((c) => c.labels))].sort((a, b) => a.localeCompare(b)),
    [cards]
  );

  // A ordem e o arrastar usam sempre a lista completa; os filtros só escondem cards na tela.
  const matchesFilters = React.useCallback(
    (card: KanbanCardType) => {
      if (filters.person === "sem" && card.assigneeIds.length > 0) return false;
      if (
        filters.person !== "todos" &&
        filters.person !== "sem" &&
        !card.assigneeIds.includes(filters.person)
      )
        return false;
      if (filters.label !== "todas" && !card.labels.includes(filters.label)) return false;
      if (filters.overdueOnly && !isOverdue(card.dueDate)) return false;
      return true;
    },
    [filters]
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
    <div className="flex flex-col gap-4">
      <KanbanFiltersBar
        filters={filters}
        onChange={setFilters}
        members={members}
        currentUserId={currentUser.id}
        labels={allLabels}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {columns.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={column}
              index={index}
              siblings={columns}
              totalCards={cardsByColumn.get(column.id)?.length ?? 0}
              cards={(cardsByColumn.get(column.id) ?? []).filter(matchesFilters)}
              onCardClick={setSelectedCard}
              onAddCard={(title) =>
                addCard({ projectId, columnId: column.id, title })
              }
            />
          ))}
          <NewColumn onAdd={(name) => addColumn(projectId, name)} />
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={selectedCard}
        onOpenChange={(open) => !open && setSelectedCard(null)}
      />
    </div>
  );
}
