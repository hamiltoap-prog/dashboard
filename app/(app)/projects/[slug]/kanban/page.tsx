"use client";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { useProject, useStore } from "@/lib/store";

export default function ProjectKanbanPage() {
  const project = useProject();
  const { columns, cards } = useStore();

  if (!project) return null;

  const projectColumns = columns
    .filter((c) => c.projectId === project.id)
    .sort((a, b) => a.position - b.position);
  const projectCards = cards.filter((c) => c.projectId === project.id);

  return (
    <KanbanBoard projectId={project.id} columns={projectColumns} cards={projectCards} />
  );
}
