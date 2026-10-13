"use client";

import * as React from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { Download, Plus } from "lucide-react";

import { MonthCalendar } from "@/components/calendar/month-calendar";
import { MeetingDialog } from "@/components/calendar/meeting-dialog";
import { MeetingItem } from "@/components/calendar/meeting-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadIcs } from "@/lib/ics";
import { occurrencesOf, type Occurrence } from "@/lib/recurrence";
import { useProject, useStore } from "@/lib/store";
import type { Meeting } from "@/lib/types";

export default function ProjectCalendarPage() {
  const project = useProject();
  const { meetings } = useStore();

  const [month, setMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null);
  const [editingOccurrence, setEditingOccurrence] = React.useState<string | null>(null);
  const [dialogKey, setDialogKey] = React.useState(0);

  if (!project) return null;

  const projectMeetings = meetings.filter((m) => m.projectId === project.id);

  // Reuniões recorrentes não têm fim: lista só uma janela (próximos 90 dias e últimos 60),
  // ou o dia escolhido no calendário.
  const now = new Date();
  const monthStart = startOfWeek(startOfMonth(month));
  const monthEnd = endOfWeek(endOfMonth(month));
  const monthOccurrences = occurrencesOf(projectMeetings, monthStart, monthEnd);

  let upcoming: Occurrence[];
  let past: Occurrence[];
  if (selectedDay) {
    const day = occurrencesOf(projectMeetings, startOfDay(selectedDay), endOfDay(selectedDay));
    upcoming = day.filter((o) => new Date(o.startsAt) >= now);
    past = day.filter((o) => new Date(o.startsAt) < now).reverse();
  } else {
    upcoming = occurrencesOf(projectMeetings, now, addDays(now, 90));
    past = occurrencesOf(projectMeetings, subDays(now, 60), now).reverse();
  }

  function openCreate() {
    setEditingMeeting(null);
    setEditingOccurrence(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(occurrence: Occurrence) {
    setEditingMeeting(occurrence.meeting);
    setEditingOccurrence(occurrence.startsAt);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        {projectMeetings.length > 0 && (
          <Button
            variant="outline"
            onClick={() => downloadIcs(projectMeetings, `${project.slug}-reunioes`, project.name)}
            title="Exporta todas as reuniões para Apple Calendar, Outlook e outros"
          >
            <Download />
            Exportar .ics
          </Button>
        )}
        <Button onClick={openCreate}>
          <Plus />
          Nova reunião
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          occurrences={monthOccurrences}
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
                upcoming.map((occurrence) => (
                  <MeetingItem
                    key={`${occurrence.meeting.id}-${occurrence.startsAt}`}
                    occurrence={occurrence}
                    onClick={() => openEdit(occurrence)}
                  />
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
                {past.map((occurrence) => (
                  <MeetingItem
                    key={`${occurrence.meeting.id}-${occurrence.startsAt}`}
                    occurrence={occurrence}
                    onClick={() => openEdit(occurrence)}
                  />
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
        occurrenceStartsAt={editingOccurrence}
        defaultDate={selectedDay}
      />
    </div>
  );
}
