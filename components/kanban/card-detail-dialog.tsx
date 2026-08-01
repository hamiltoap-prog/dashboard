"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { KanbanCard } from "@/lib/types";

export function CardDetailDialog({
  card,
  onOpenChange,
}: {
  card: KanbanCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  // Mantém o último card exibido durante a animação de fechamento do
  // diálogo (quando `card` já virou null), seguindo o padrão do React de
  // ajustar estado durante a renderização em vez de usar um efeito.
  const [displayCard, setDisplayCard] = React.useState(card);
  if (card && card !== displayCard) setDisplayCard(card);

  return (
    <Dialog open={Boolean(card)} onOpenChange={onOpenChange}>
      <DialogContent>
        {displayCard && (
          <CardForm key={displayCard.id} card={displayCard} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardForm({
  card,
  onOpenChange,
}: {
  card: KanbanCard;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCard, deleteCard } = useStore();

  const [title, setTitle] = React.useState(card.title);
  const [description, setDescription] = React.useState(card.description ?? "");
  const [labels, setLabels] = React.useState(card.labels.join(", "));
  const [dueDate, setDueDate] = React.useState(
    card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : ""
  );

  function save() {
    updateCard(card.id, {
      title: title.trim() || card.title,
      description,
      labels: labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    onOpenChange(false);
  }

  function handleDelete() {
    deleteCard(card.id);
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar card</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-title">Título</Label>
          <Input id="card-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-description">Descrição</Label>
          <Textarea
            id="card-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-labels">Etiquetas</Label>
            <Input
              id="card-labels"
              placeholder="Ensaio, Urgente"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-due">Prazo</Label>
            <Input
              id="card-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="mt-2 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 />
          Excluir card
        </Button>
        <Button type="button" onClick={save}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
