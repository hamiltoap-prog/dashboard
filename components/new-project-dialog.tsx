"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao projeto."),
  description: z.string().trim().max(400, "Descrição muito longa.").optional(),
  status: z.custom<ProjectStatus>(),
  coverImageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Use um link http(s) válido.")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function NewProjectDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { createProject } = useStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", status: "planejamento", coverImageUrl: "" },
  });

  function onSubmit(values: FormValues) {
    const project = createProject({
      name: values.name,
      description: values.description ?? "",
      status: values.status,
      coverImageUrl: values.coverImageUrl,
    });
    toast.success("Projeto criado", { description: project.name });
    setOpen(false);
    form.reset();
    router.push(`/projects/${project.slug}`);
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
        <Button size="default">
          <Plus />
          Novo projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>
            Crie um espaço para organizar roteiro, referências, fases e reuniões.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome do espetáculo / projeto</Label>
            <Input id="name" placeholder="Ex: Auto da Compadecida" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Do que se trata esse projeto?"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Fase atual</Label>
            <Select
              defaultValue="planejamento"
              onValueChange={(v) => form.setValue("status", v as ProjectStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coverImageUrl">Imagem de capa (link)</Label>
            <Input
              id="coverImageUrl"
              placeholder="https://..."
              {...form.register("coverImageUrl")}
            />
            {form.formState.errors.coverImageUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.coverImageUrl.message}
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar projeto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
