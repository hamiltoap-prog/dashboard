"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectActionsMenu({
  project,
  className,
  redirectOnDelete = false,
}: {
  project: Project;
  className?: string;
  redirectOnDelete?: boolean;
}) {
  const router = useRouter();
  const { deleteProject } = useStore();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  function handleDelete() {
    deleteProject(project.id);
    toast.success("Projeto excluído", { description: project.name });
    setDeleteOpen(false);
    if (redirectOnDelete) router.push("/");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("bg-black/40 text-white hover:bg-black/55 hover:text-white", className)}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Ações do projeto</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar projeto
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Excluir projeto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir &quot;{project.name}&quot;?</DialogTitle>
            <DialogDescription>
              Isso remove o projeto e tudo dentro dele — kanban, arquivos, referências e
              reuniões. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
