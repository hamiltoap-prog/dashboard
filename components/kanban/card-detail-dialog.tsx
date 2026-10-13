"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Send, Trash2, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { dueInputValue, dueIsoFromInput } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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
  const {
    updateCard,
    deleteCard,
    moveCard,
    setChecklist,
    addComment,
    deleteComment,
    columns,
    cards,
    comments,
    projects,
    getProfile,
    currentUser,
  } = useStore();
  const project = projects.find((p) => p.id === card.projectId);
  const cardComments = comments.filter((c) => c.cardId === card.id);
  const projectColumns = columns
    .filter((c) => c.projectId === card.projectId)
    .sort((a, b) => a.position - b.position);
  const [columnId, setColumnId] = React.useState(card.columnId);

  const members = (project?.memberIds ?? [])
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const [assigneeIds, setAssigneeIds] = React.useState(card.assigneeIds);
  const [checklist, setChecklistState] = React.useState(card.checklist);
  const [newItem, setNewItem] = React.useState("");
  const [comment, setComment] = React.useState("");

  // Checklist e comentários são gravados na hora; o resto do card, ao clicar em Salvar.
  function changeChecklist(next: typeof checklist) {
    setChecklistState(next);
    setChecklist(card.id, next);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    changeChecklist([...checklist, { id: crypto.randomUUID(), text, done: false }]);
    setNewItem("");
  }

  function sendComment() {
    if (!comment.trim()) return;
    addComment(card.id, comment);
    setComment("");
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const [title, setTitle] = React.useState(card.title);
  const [description, setDescription] = React.useState(card.description ?? "");
  const [labels, setLabels] = React.useState(card.labels.join(", "));
  const [dueDate, setDueDate] = React.useState(
    card.dueDate ? dueInputValue(card.dueDate) : ""
  );

  function save() {
    updateCard(card.id, {
      title: title.trim() || card.title,
      description,
      labels: labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      dueDate: dueDate ? dueIsoFromInput(dueDate) : null,
      assigneeIds,
    });
    if (columnId !== card.columnId) {
      // vai para o fim da coluna escolhida
      moveCard(card.id, columnId, cards.filter((c) => c.columnId === columnId).length);
    }
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-column">Coluna</Label>
          <Select value={columnId} onValueChange={setColumnId}>
            <SelectTrigger id="card-column">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectColumns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Responsáveis</Label>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const selected = assigneeIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleAssignee(member.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <UserAvatar profile={member} className="size-6 text-[10px]" />
                  {member.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Checklist</Label>
            {checklist.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {checklist.filter((i) => i.done).length}/{checklist.length}
              </span>
            )}
          </div>
          {checklist.length > 0 && (
            <ul className="flex flex-col gap-1">
              {checklist.map((item) => (
                <li key={item.id} className="group flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-label={item.text}
                    onChange={() =>
                      changeChecklist(
                        checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
                      )
                    }
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-words text-sm",
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover item ${item.text}`}
                    onClick={() => changeChecklist(checklist.filter((i) => i.id !== item.id))}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addItem} className="flex gap-2">
            <Input
              placeholder="Adicionar item"
              aria-label="Novo item da checklist"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar item">
              <Plus />
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Label>Comentários {cardComments.length > 0 && `(${cardComments.length})`}</Label>
          {cardComments.length > 0 && (
            <ul className="flex flex-col gap-3">
              {cardComments.map((c) => {
                const author = getProfile(c.userId);
                const canDelete = c.userId === currentUser.id || project?.createdBy === currentUser.id;
                return (
                  <li key={c.id} className="flex items-start gap-2.5">
                    {author && <UserAvatar profile={author} className="size-7 shrink-0 text-[10px]" />}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{author?.name ?? "Alguém"}</span>
                        <span>
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                        {canDelete && (
                          <button
                            type="button"
                            aria-label="Excluir comentário"
                            onClick={() => deleteComment(c.id)}
                            className="ml-auto rounded p-1 hover:bg-accent hover:text-foreground"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              placeholder="Escreva um comentário..."
              aria-label="Novo comentário"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              aria-label="Enviar comentário"
              disabled={!comment.trim()}
              onClick={sendComment}
            >
              <Send />
            </Button>
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
