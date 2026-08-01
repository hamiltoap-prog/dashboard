"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { File, FileText, MoreVertical, Paperclip, Table, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { FILE_TYPE_LABEL, type FileType, type ProjectFile } from "@/lib/types";

const TYPE_ICON: Record<FileType, typeof FileText> = {
  roteiro: FileText,
  documento: File,
  planilha: Table,
  outro: Paperclip,
};

export function FileList({ files }: { files: ProjectFile[] }) {
  const { getProfile, deleteFile } = useStore();

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="font-medium">Nenhum arquivo ainda</p>
        <p className="text-sm text-muted-foreground">
          Adicione o link do roteiro ou de documentos de referência.
        </p>
      </div>
    );
  }

  const groups = (Object.keys(FILE_TYPE_LABEL) as FileType[])
    .map((type) => ({ type, items: files.filter((f) => f.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const Icon = TYPE_ICON[group.type];
        return (
          <div key={group.type} className="flex flex-col gap-2">
            <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {FILE_TYPE_LABEL[group.type]}
            </h3>
            <div className="flex flex-col gap-2">
              {group.items.map((file) => {
                const addedBy = getProfile(file.addedBy);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 flex-col"
                    >
                      <span className="truncate text-sm font-medium hover:underline">
                        {file.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {addedBy?.name ?? "Alguém"} · adicionado{" "}
                        {formatDistanceToNow(new Date(file.addedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </a>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => deleteFile(file.id)}
                        >
                          <Trash2 />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
