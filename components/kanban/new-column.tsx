"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setName("");
    setAdding(false);
  }

  if (!adding) {
    return (
      <div className="w-[280px] shrink-0 sm:w-[300px]">
        <Button
          variant="outline"
          className="w-full justify-start border-dashed text-muted-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus />
          Nova coluna
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-[280px] shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:w-[300px]"
    >
      <Input
        autoFocus
        placeholder="Nome da coluna"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Adicionar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
