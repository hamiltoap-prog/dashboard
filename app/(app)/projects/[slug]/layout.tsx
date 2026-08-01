"use client";

import Link from "next/link";
import { ArrowLeft, Drama } from "lucide-react";

import { ProjectTabsNav } from "@/components/project-tabs-nav";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ProjectActionsMenu } from "@/components/project-actions-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProject, useStore } from "@/lib/store";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const project = useProject();
  const { getProfile } = useStore();

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <p className="font-medium">Projeto não encontrado</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Voltar para o dashboard
        </Link>
      </div>
    );
  }

  const members = project.memberIds
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Projetos
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-32 w-full bg-secondary sm:h-40">
          {project.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.coverImageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Drama className="size-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {project.name}
                </h1>
                <StatusBadge status={project.status} />
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {members.map((member) => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                      <span>
                        <UserAvatar profile={member} className="size-8" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{member.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <ProjectActionsMenu
                project={project}
                redirectOnDelete
                className="bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
              />
            </div>
          </div>

          <ProjectTabsNav slug={project.slug} />
        </div>
      </div>

      {children}
    </div>
  );
}
