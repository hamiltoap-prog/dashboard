"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { KanbanColumn } from "@/lib/types";

const DELETE_CARDS = "__delete__";

export function ColumnMenu({
  column,
  index,
  siblings,
  cardCount,
}: {
  column: KanbanColumn;
  index: number;
  siblings: KanbanColumn[];
  cardCount: number;
}) {
  const { renameColumn, moveColumn, deleteColumn } = useStore();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState(column.name);

  const others = siblings.filter((c) => c.id !== column.id);
  const [destination, setDestination] = React.useState(others[0]?.id ?? DELETE_CARDS);
  const isLast = others.length === 0;

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) renameColumn(column.id, trimmed);
    setRenameOpen(false);
  }

  function handleDelete() {
    deleteColumn(column.id, destination === DELETE_CARDS ? null : destination);
    setDeleteOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Opções da coluna ${column.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem
            onSelect={() => {
              setName(column.name);
              setRenameOpen(true);
            }}
          >
            <Pencil />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onSelect={() => moveColumn(column.id, -1)}>
            <ArrowLeft />
            Mover para a esquerda
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === siblings.length - 1}
            onSelect={() => moveColumn(column.id, 1)}
          >
            <ArrowRight />
            Mover para a direita
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isLast}
            onSelect={() => {
              setDestination(others[0]?.id ?? DELETE_CARDS);
              setDeleteOpen(true);
            }}
          >
            <Trash2 />
            Excluir coluna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRename} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Renomear coluna</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="column-name">Nome</Label>
              <Input
                id="column-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a coluna “{column.name}”?</DialogTitle>
            <DialogDescription>
              {cardCount > 0
                ? `Esta coluna tem ${cardCount} ${cardCount === 1 ? "card" : "cards"}. Escolha o que fazer com eles.`
                : "A coluna está vazia."}
            </DialogDescription>
          </DialogHeader>

          {cardCount > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Cards</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {others.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Mover para “{c.name}”
                    </SelectItem>
                  ))}
                  <SelectItem value={DELETE_CARDS}>Excluir os cards também</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Excluir coluna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
