"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, ImageOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import type { ProjectReference } from "@/lib/types";

export function ReferenceViewerDialog({
  reference,
  onOpenChange,
}: {
  reference: ProjectReference | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { getProfile, deleteReference } = useStore();
  const [imgError, setImgError] = React.useState(false);

  if (!reference) return null;

  const youTubeId = reference.type === "video" ? getYouTubeId(reference.url) : null;
  const hasImage = Boolean(reference.thumbnailUrl) && !imgError;
  const addedBy = getProfile(reference.addedBy);

  function handleDelete() {
    if (!reference) return;
    deleteReference(reference.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={Boolean(reference)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{reference.title}</DialogTitle>

        <div className="relative aspect-video w-full bg-black">
          {youTubeId ? (
            <iframe
              src={youTubeEmbedUrl(youTubeId)}
              title={reference.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          ) : hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reference.thumbnailUrl!}
              alt={reference.title}
              onError={() => setImgError(true)}
              className="size-full object-contain"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-white/70">
              <ImageOff className="size-8" />
              <p className="text-sm">Sem preview — abra o link original para ver.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="font-medium leading-snug">{reference.title}</p>
              <p className="text-xs text-muted-foreground">
                Adicionado por {addedBy?.name ?? "alguém"}
                {" · "}
                {formatDistanceToNow(new Date(reference.addedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            <Badge variant="secondary">{reference.sourceLabel}</Badge>
          </div>

          {reference.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {reference.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[11px]">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" asChild>
              <a href={reference.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Abrir original
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 />
              Remover
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
