"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Meeting } from "@/lib/types";

function combine(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  meeting?: Meeting | null;
  defaultDate?: Date | null;
}

export function MeetingDialog({ open, onOpenChange, projectId, meeting, defaultDate }: MeetingDialogProps) {
  // `meeting`/`defaultDate` só importam no instante em que o diálogo abre —
  // o componente pai troca a `key` a cada abertura para reiniciar o formulário.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MeetingForm
          projectId={projectId}
          meeting={meeting}
          defaultDate={defaultDate}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function MeetingForm({
  projectId,
  meeting,
  defaultDate,
  onOpenChange,
}: Omit<MeetingDialogProps, "open">) {
  const { addMeeting, updateMeeting, deleteMeeting } = useStore();
  const isEditing = Boolean(meeting);

  const [title, setTitle] = React.useState(meeting?.title ?? "");
  const [date, setDate] = React.useState(
    format(meeting ? new Date(meeting.startsAt) : defaultDate ?? new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = React.useState(
    meeting ? format(new Date(meeting.startsAt), "HH:mm") : "19:00"
  );
  const [endTime, setEndTime] = React.useState(
    meeting?.endsAt ? format(new Date(meeting.endsAt), "HH:mm") : ""
  );
  const [location, setLocation] = React.useState(meeting?.location ?? "");
  const [notes, setNotes] = React.useState(meeting?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const startsAt = combine(date, startTime);
    const endsAt = endTime ? combine(date, endTime) : null;

    if (meeting) {
      updateMeeting(meeting.id, { title, startsAt, endsAt, location, notes });
      toast.success("Reunião atualizada");
    } else {
      addMeeting({ projectId, title, startsAt, endsAt, location, notes });
      toast.success("Reunião marcada");
    }
    onOpenChange(false);
  }

  function handleDelete() {
    if (!meeting) return;
    deleteMeeting(meeting.id);
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar reunião" : "Nova reunião"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-title">Título</Label>
          <Input
            id="meeting-title"
            placeholder="Ex: Ensaio técnico com luz e som"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="meeting-date">Data</Label>
            <Input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-start">Início</Label>
            <Input
              id="meeting-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-end">Fim</Label>
            <Input
              id="meeting-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-location">Local</Label>
          <Input
            id="meeting-location"
            placeholder="Presencial ou link da chamada"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-notes">Notas / pauta</Label>
          <Textarea
            id="meeting-notes"
            rows={3}
            placeholder="O que foi (ou será) discutido"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <DialogFooter className="mt-2 sm:justify-between">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit">{isEditing ? "Salvar" : "Marcar reunião"}</Button>
        </DialogFooter>
      </form>
    </>
  );
}
