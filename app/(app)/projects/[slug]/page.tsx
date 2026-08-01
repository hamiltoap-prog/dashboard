"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Columns3, FileText, Images } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/activity-feed";
import { useProject, useStore } from "@/lib/store";

export default function ProjectOverviewPage() {
  const project = useProject();
  const { cards, files, references, meetings, activity } = useStore();

  if (!project) return null;

  const projectCards = cards.filter((c) => c.projectId === project.id);
  const projectFiles = files.filter((f) => f.projectId === project.id);
  const projectReferences = references.filter((r) => r.projectId === project.id);
  const upcomingMeetings = meetings
    .filter((m) => m.projectId === project.id && new Date(m.startsAt) >= new Date())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);
  const recentActivity = activity.filter((a) => a.projectId === project.id).slice(0, 6);

  const stats = [
    { label: "Cards no quadro", value: projectCards.length, icon: Columns3, href: "kanban" },
    { label: "Arquivos", value: projectFiles.length, icon: FileText, href: "arquivos" },
    { label: "Referências", value: projectReferences.length, icon: Images, href: "referencias" },
    { label: "Próximas reuniões", value: upcomingMeetings.length, icon: Calendar, href: "calendario" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={`/projects/${project.slug}/${stat.href}`}>
            <Card className="gap-2 py-4 transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between px-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <stat.icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed entries={recentActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma reunião marcada.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {upcomingMeetings.map((meeting) => (
                  <li key={meeting.id} className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{meeting.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(meeting.startsAt), "EEEE, d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                    {meeting.location && (
                      <span className="text-xs text-muted-foreground">{meeting.location}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
