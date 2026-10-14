"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, GalleryHorizontal, ImageMinus, ImageOff, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InstagramEmbed } from "@/components/references/instagram-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { getInstagramPost } from "@/lib/instagram";
import { deleteReferenceImage, uploadReferenceImage } from "@/lib/reference-images";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import type { ProjectReference } from "@/lib/types";

export function ReferenceViewerDialog({
  reference,
  onOpenChange,
}: {
  reference: ProjectReference | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { getProfile, deleteReference, updateReference } = useStore();
  const [imgError, setImgError] = React.useState(false);
  const [showPost, setShowPost] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // nova imagem → tenta mostrar de novo
  const thumbnailUrl = reference?.thumbnailUrl ?? null;
  const [lastUrl, setLastUrl] = React.useState(thumbnailUrl);
  if (thumbnailUrl !== lastUrl) {
    setLastUrl(thumbnailUrl);
    setImgError(false);
  }

  if (!reference) return null;

  const youTubeId = reference.type === "video" ? getYouTubeId(reference.url) : null;
  const hasImage = Boolean(reference.thumbnailUrl) && !imgError;
  const instagram = youTubeId ? null : getInstagramPost(reference.url);
  // Postagem do Instagram: mostra a imagem salva; a postagem interativa (carrossel, reel) fica a um toque.
  const embedInstagram = Boolean(instagram) && (showPost || !hasImage);
  const canChangeImage = !youTubeId && reference.type !== "imagem";
  const addedBy = getProfile(reference.addedBy);

  function handleDelete() {
    if (!reference) return;
    deleteReference(reference.id);
    onOpenChange(false);
  }

  async function handleFile(file: File | undefined) {
    if (!reference || !file) return;
    setUploading(true);
    try {
      const previous = reference.thumbnailPath;
      const { url, path } = await uploadReferenceImage(reference.projectId, reference.id, file);
      await updateReference(reference.projectId, reference.id, { thumbnailUrl: url, thumbnailPath: path, thumbnailSource: "upload" });
      if (previous && previous !== path) deleteReferenceImage(previous);
      setShowPost(false);
      toast.success("Imagem salva");
    } catch (error) {
      toast.error("Não foi possível enviar a imagem.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    if (!reference?.thumbnailPath) return;
    const path = reference.thumbnailPath;
    try {
      await updateReference(reference.projectId, reference.id, { thumbnailUrl: null, thumbnailPath: null, thumbnailSource: null });
      deleteReferenceImage(path);
    } catch {
      // o aviso de erro já aparece pelo store
    }
  }

  return (
    <Dialog open={Boolean(reference)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:p-0">
        <DialogTitle className="sr-only">{reference.title}</DialogTitle>

        {embedInstagram && instagram ? (
          <InstagramEmbed post={instagram} title={reference.title} interactive />
        ) : (
          <div
            className={
              hasImage && !youTubeId
                ? "relative flex max-h-[60dvh] w-full items-center justify-center bg-black"
                : "relative aspect-video w-full bg-black"
            }
          >
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
                className="max-h-[60dvh] w-full object-contain"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
                <ImageOff className="size-8" />
                <p className="text-sm">Sem imagem — envie uma em “Enviar imagem” ou abra o link original.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 p-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium leading-snug wrap-anywhere">{reference.title}</p>
              <p className="text-xs text-muted-foreground">
                Adicionado por {addedBy?.name ?? "alguém"}
                {" · "}
                {formatDistanceToNow(new Date(reference.addedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">{reference.sourceLabel}</Badge>
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

          {(canChangeImage || (instagram && hasImage)) && (
            <div className="flex flex-wrap gap-2">
              {instagram && hasImage && (
                <Button variant="outline" size="sm" onClick={() => setShowPost((v) => !v)}>
                  <GalleryHorizontal />
                  {showPost ? "Ver imagem" : "Ver postagem interativa"}
                </Button>
              )}
              {canChangeImage && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Escolher imagem"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                    {reference.thumbnailUrl ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  {reference.thumbnailPath && (
                    <Button variant="ghost" size="sm" disabled={uploading} onClick={handleRemoveImage}>
                      <ImageMinus />
                      Remover imagem
                    </Button>
                  )}
                </>
              )}
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
