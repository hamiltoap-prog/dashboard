"use client";

import { AddFileDialog } from "@/components/files/add-file-dialog";
import { FileList } from "@/components/files/file-list";
import { useProject, useStore } from "@/lib/store";

export default function ProjectFilesPage() {
  const project = useProject();
  const { files } = useStore();

  if (!project) return null;

  const projectFiles = files.filter((f) => f.projectId === project.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <AddFileDialog projectId={project.id} />
      </div>
      <FileList files={projectFiles} />
    </div>
  );
}
