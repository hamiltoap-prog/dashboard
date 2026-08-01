"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";

export default function DashboardPage() {
  const { projects } = useStore();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<ProjectStatus | "todos">("todos");

  const filtered = projects
    .filter((p) => (status === "todos" ? true : p.status === status))
    .filter((p) =>
      query.trim()
        ? (p.name + " " + p.description).toLowerCase().includes(query.trim().toLowerCase())
        : true
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"} no total
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projetos..."
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | "todos")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as fases</SelectItem>
            {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-medium">Nenhum projeto encontrado</p>
          <p className="text-sm text-muted-foreground">
            Ajuste a busca ou crie um novo projeto.
          </p>
        </div>
      )}
    </div>
  );
}
