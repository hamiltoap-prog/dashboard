"use client";

import { AlarmClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export interface KanbanFilters {
  // "todos" | "sem" (sem responsável) | id da pessoa
  person: string;
  label: string;
  overdueOnly: boolean;
}

export const NO_FILTERS: KanbanFilters = { person: "todos", label: "todas", overdueOnly: false };

export function hasActiveFilters(filters: KanbanFilters) {
  return filters.person !== "todos" || filters.label !== "todas" || filters.overdueOnly;
}

export function KanbanFiltersBar({
  filters,
  onChange,
  members,
  currentUserId,
  labels,
}: {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  members: Profile[];
  currentUserId: string;
  labels: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.person} onValueChange={(person) => onChange({ ...filters, person })}>
        <SelectTrigger className="h-9 w-auto min-w-40" aria-label="Filtrar por responsável">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as pessoas</SelectItem>
          <SelectItem value="sem">Sem responsável</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.id === currentUserId ? `${m.name} (eu)` : m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {labels.length > 0 && (
        <Select value={filters.label} onValueChange={(label) => onChange({ ...filters, label })}>
          <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filtrar por etiqueta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as etiquetas</SelectItem>
            {labels.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <button
        type="button"
        aria-pressed={filters.overdueOnly}
        onClick={() => onChange({ ...filters, overdueOnly: !filters.overdueOnly })}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          filters.overdueOnly
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border text-muted-foreground hover:bg-accent"
        )}
      >
        <AlarmClock className="size-4" />
        Atrasados
      </button>

      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(NO_FILTERS)}>
          <X />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
