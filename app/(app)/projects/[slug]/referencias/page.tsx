"use client";

import * as React from "react";

import { AddReferenceDialog } from "@/components/references/add-reference-dialog";
import { ReferenceCard } from "@/components/references/reference-card";
import { ReferenceViewerDialog } from "@/components/references/reference-viewer-dialog";
import { getInstagramPost } from "@/lib/instagram";
import { requestInstagramImage } from "@/lib/instagram-image-client";
import { useProject, useStore } from "@/lib/store";

export default function ProjectReferencesPage() {
  const project = useProject();
  const { references } = useStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const projectId = project?.id;
  const projectReferences = React.useMemo(
    () => references.filter((r) => r.projectId === projectId),
    [references, projectId]
  );
  // acompanha a referência ao vivo (ex.: a imagem chega enquanto o visualizador está aberto)
  const selected = projectReferences.find((r) => r.id === selectedId) ?? null;

  React.useEffect(() => {
    if (!projectId) return;
    const pending = projectReferences.filter(
      (r) => !r.thumbnailUrl && !r.thumbnailTriedAt && getInstagramPost(r.url)
    );
    // Referências do Instagram ainda sem imagem (ex.: cadastradas antes desta função): pede ao
    // servidor para buscar a imagem do post. O servidor marca a tentativa para não repetir sem parar.
    (async () => {
      for (const r of pending) await requestInstagramImage(projectId, r.id);
    })();
  }, [projectId, projectReferences]);

  if (!project) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <AddReferenceDialog projectId={project.id} />
      </div>

      {projectReferences.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Nenhuma referência ainda</p>
          <p className="text-sm text-muted-foreground">
            Adicione postagens do Instagram, vídeos do YouTube ou imagens para inspirar o projeto.
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {projectReferences.map((reference) => (
            <ReferenceCard
              key={reference.id}
              reference={reference}
              onClick={() => setSelectedId(reference.id)}
            />
          ))}
        </div>
      )}

      <ReferenceViewerDialog
        key={selected?.id ?? "none"}
        reference={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
