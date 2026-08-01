"use client";

import Link from "next/link";
import { ptBR } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { Drama } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ProjectActionsMenu } from "@/components/project-actions-menu";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const { getProfile } = useStore();
  const members = project.memberIds
    .map((id) => getProfile(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/projects/${project.slug}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
          {project.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.coverImageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Drama className="size-8" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-3 top-3">
            <StatusBadge status={project.status} className="bg-black/45 text-white backdrop-blur-sm [&_span]:bg-white" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-1 font-semibold tracking-tight">{project.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((member) => (
                <UserAvatar key={member.id} profile={member} className="size-6 text-[10px]" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              atualizado{" "}
              {formatDistanceToNow(new Date(project.updatedAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </Link>

      <ProjectActionsMenu project={project} className="absolute right-3 top-3" />
    </div>
  );
}
