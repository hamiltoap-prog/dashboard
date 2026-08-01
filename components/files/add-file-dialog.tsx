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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { FILE_TYPE_LABEL, type FileType } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao arquivo."),
  url: z.string().trim().url("Cole um link válido (http/https)."),
  type: z.custom<FileType>(),
  notes: z.string().trim().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddFileDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const { addFile } = useStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", url: "", type: "roteiro", notes: "" },
  });

  function onSubmit(values: FormValues) {
    addFile({
      projectId,
      name: values.name,
      url: values.url,
      type: values.type,
      notes: values.notes,
    });
    toast.success("Arquivo adicionado");
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
          Adicionar arquivo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar arquivo</DialogTitle>
          <DialogDescription>
            Cole o link do Google Docs, Drive ou onde o arquivo estiver hospedado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-name">Nome</Label>
            <Input id="file-name" placeholder="Ex: Roteiro final — Ato I" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-url">Link</Label>
            <Input id="file-url" placeholder="https://..." {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-type">Tipo</Label>
            <Select
              defaultValue="roteiro"
              onValueChange={(v) => form.setValue("type", v as FileType)}
            >
              <SelectTrigger id="file-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILE_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-notes">Notas (opcional)</Label>
            <Textarea id="file-notes" rows={2} {...form.register("notes")} />
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
