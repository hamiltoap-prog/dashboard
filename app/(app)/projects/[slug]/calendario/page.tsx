"use client";

import * as React from "react";
import { isSameDay } from "date-fns";
import { Plus } from "lucide-react";

import { MonthCalendar } from "@/components/calendar/month-calendar";
import { MeetingDialog } from "@/components/calendar/meeting-dialog";
import { MeetingItem } from "@/components/calendar/meeting-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject, useStore } from "@/lib/store";
import type { Meeting } from "@/lib/types";

export default function ProjectCalendarPage() {
  const project = useProject();
  const { meetings } = useStore();

  const [month, setMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null);
  const [dialogKey, setDialogKey] = React.useState(0);

  if (!project) return null;

  const projectMeetings = meetings
    .filter((m) => m.projectId === project.id)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const now = new Date();
  const visibleMeetings = selectedDay
    ? projectMeetings.filter((m) => isSameDay(new Date(m.startsAt), selectedDay))
    : projectMeetings;

  const upcoming = visibleMeetings.filter((m) => new Date(m.startsAt) >= now);
  const past = visibleMeetings
    .filter((m) => new Date(m.startsAt) < now)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  function openCreate() {
    setEditingMeeting(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(meeting: Meeting) {
    setEditingMeeting(meeting);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus />
          Nova reunião
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          meetings={projectMeetings}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Próximas reuniões</CardTitle>
              {selectedDay && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                  Limpar filtro
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma reunião marcada.
                </p>
              ) : (
                upcoming.map((meeting) => (
                  <MeetingItem key={meeting.id} meeting={meeting} onClick={() => openEdit(meeting)} />
                ))
              )}
            </CardContent>
          </Card>

          {past.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reuniões passadas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {past.map((meeting) => (
                  <MeetingItem key={meeting.id} meeting={meeting} onClick={() => openEdit(meeting)} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MeetingDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={project.id}
        meeting={editingMeeting}
        defaultDate={selectedDay}
      />
    </div>
  );
}
