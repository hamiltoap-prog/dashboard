"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/activity-feed";
import { useProject, useStore } from "@/lib/store";

export default function ProjectActivityPage() {
  const project = useProject();
  const { activity } = useStore();

  if (!project) return null;

  const entries = activity.filter((a) => a.projectId === project.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade do projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <ActivityFeed entries={entries} emptyMessage="Ainda não há atividade neste projeto." />
      </CardContent>
    </Card>
  );
}
