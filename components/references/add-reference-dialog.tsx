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
import { CoverImagePicker } from "@/components/references/cover-image-picker";
import { InstagramEmbed } from "@/components/references/instagram-embed";
import { getInstagramPost } from "@/lib/instagram";
import { requestInstagramImage } from "@/lib/instagram-image-client";
import { uploadReferenceImage } from "@/lib/reference-images";
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
  const { addReference, updateReference } = useStore();
  const [cover, setCover] = React.useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", title: "", sourceLabel: "Instagram", tags: "" },
  });

  const url = form.watch("url");
  const youTubeId = React.useMemo(() => getYouTubeId(url), [url]);
  const isDirectImage = React.useMemo(() => looksLikeDirectImageUrl(url), [url]);
  const instagram = React.useMemo(() => (youTubeId || isDirectImage ? null : getInstagramPost(url ?? "")), [url, youTubeId, isDirectImage]);
  const isPageLink = Boolean(url) && !youTubeId && !isDirectImage && !instagram;

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
    const reference = addReference({
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
    setCover(null);

    // Depois de salvar: envia a imagem escolhida ou busca a imagem do post do Instagram.
    if (cover) {
      toast.promise(
        uploadReferenceImage(projectId, reference.id, cover).then(({ url, path }) =>
          updateReference(projectId, reference.id, { thumbnailUrl: url, thumbnailPath: path, thumbnailSource: "upload" })
        ),
        { loading: "Enviando imagem…", success: "Imagem salva", error: "Não foi possível enviar a imagem." }
      );
    } else if (instagram) {
      requestInstagramImage(projectId, reference.id);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setCover(null);
        }
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
            Cole o link de uma postagem do Instagram, de um vídeo do YouTube ou de uma imagem
            (Pinterest, sites, etc).
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
            {instagram && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Postagem do Instagram detectada — a imagem do post é buscada e salva sozinha. Se
                  a prévia abaixo ficar vazia, a conta pode ser privada: nesse caso, envie um print
                  em “Imagem de capa”.
                </p>
                <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-xl border border-border">
                  <InstagramEmbed post={instagram} title="Prévia da postagem" nativeWidth={400} extraHeight={60} />
                </div>
              </div>
            )}
            {isPageLink && (
              <p className="text-xs text-muted-foreground">
                Link de página: para aparecer com foto, envie uma imagem (um print, por exemplo)
                em <strong>Imagem de capa</strong>, logo abaixo.
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

          {!youTubeId && !isDirectImage && (
            <div className="flex flex-col gap-1.5">
              <Label>Imagem de capa {instagram ? "(opcional, substitui a do post)" : "(opcional)"}</Label>
              <CoverImagePicker file={cover} onChange={setCover} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
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
