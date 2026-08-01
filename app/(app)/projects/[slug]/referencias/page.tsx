"use client";

import * as React from "react";

import { AddReferenceDialog } from "@/components/references/add-reference-dialog";
import { ReferenceCard } from "@/components/references/reference-card";
import { ReferenceViewerDialog } from "@/components/references/reference-viewer-dialog";
import { useProject, useStore } from "@/lib/store";
import type { ProjectReference } from "@/lib/types";

export default function ProjectReferencesPage() {
  const project = useProject();
  const { references } = useStore();
  const [selected, setSelected] = React.useState<ProjectReference | null>(null);

  if (!project) return null;

  const projectReferences = references.filter((r) => r.projectId === project.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <AddReferenceDialog projectId={project.id} />
      </div>

      {projectReferences.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Nenhuma referência ainda</p>
          <p className="text-sm text-muted-foreground">
            Adicione vídeos do YouTube ou imagens de outras fontes para inspirar o projeto.
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {projectReferences.map((reference) => (
            <ReferenceCard
              key={reference.id}
              reference={reference}
              onClick={() => setSelected(reference)}
            />
          ))}
        </div>
      )}

      <ReferenceViewerDialog
        key={selected?.id ?? "none"}
        reference={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
