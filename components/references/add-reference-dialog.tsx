"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { getYouTubeId, youTubeThumbnail } from "@/lib/youtube";
import { guessSourceLabel, looksLikeDirectImageUrl } from "@/lib/link-preview";
import type { ReferenceType } from "@/lib/types";

const SOURCE_OPTIONS = ["YouTube", "Instagram", "Pinterest", "Site / Blog", "Outro"];

const schema = z.object({
  url: z.string().trim().url("Cole um link válido (http/https)."),
  title: z.string().trim().min(2, "Dê um título para a referência."),
  sourceLabel: z.string().min(1),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddReferenceDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const { addReference } = useStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", title: "", sourceLabel: "Instagram", tags: "" },
  });

  const url = form.watch("url");
  const youTubeId = React.useMemo(() => getYouTubeId(url), [url]);
  const isDirectImage = React.useMemo(() => looksLikeDirectImageUrl(url), [url]);
  const isPageLink = Boolean(url) && !youTubeId && !isDirectImage;

  React.useEffect(() => {
    if (!url) return;
    if (youTubeId) {
      form.setValue("sourceLabel", "YouTube");
    } else {
      const guessed = guessSourceLabel(url);
      if (SOURCE_OPTIONS.includes(guessed)) form.setValue("sourceLabel", guessed);
    }
  }, [url, youTubeId, form]);

  function onSubmit(values: FormValues) {
    const type: ReferenceType = youTubeId ? "video" : isDirectImage ? "imagem" : "link";
    addReference({
      projectId,
      type,
      url: values.url,
      title: values.title,
      sourceLabel: values.sourceLabel,
      thumbnailUrl: youTubeId ? youTubeThumbnail(youTubeId) : type === "imagem" ? values.url : null,
      tags: values.tags
        ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    });
    toast.success("Referência adicionada");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Adicionar referência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar referência</DialogTitle>
          <DialogDescription>
            Cole um link do YouTube para virar vídeo, ou o link de uma imagem (Instagram,
            Pinterest, etc).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ref-url">Link</Label>
            <Input id="ref-url" placeholder="https://..." {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
            {youTubeId && (
              <p className="text-xs text-muted-foreground">
                Vídeo do YouTube detectado — vai aparecer com player embutido.
              </p>
            )}
            {isDirectImage && (
              <p className="text-xs text-muted-foreground">
                Link direto de imagem detectado — vai aparecer com a foto.
              </p>
            )}
            {isPageLink && (
              <p className="text-xs text-muted-foreground">
                Esse é um link de página (não o arquivo da imagem), então vai aparecer como um
                card de link, sem preview. Para mostrar a foto: abra o post, clique com o botão
                direito na imagem → <strong>&quot;Copiar endereço da imagem&quot;</strong> — e
                cole esse link aqui em vez do link do post.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ref-title">Título</Label>
            <Input
              id="ref-title"
              placeholder="Ex: Paleta de figurino nordestino"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-source">Fonte</Label>
              <Select
                value={form.watch("sourceLabel")}
                onValueChange={(v) => form.setValue("sourceLabel", v)}
              >
                <SelectTrigger id="ref-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-tags">Tags (opcional)</Label>
              <Input id="ref-tags" placeholder="figurino, cor" {...form.register("tags")} />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
