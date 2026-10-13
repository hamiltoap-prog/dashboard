"use client";

import * as React from "react";
import { format } from "date-fns";
import { Repeat, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Meeting, Recurrence } from "@/lib/types";

function combine(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

type RepeatKey = "none" | "daily" | "weekly" | "biweekly" | "monthly";

const REPEAT_LABEL: Record<RepeatKey, string> = {
  none: "Não se repete",
  daily: "Todo dia",
  weekly: "Toda semana",
  biweekly: "A cada 2 semanas",
  monthly: "Todo mês",
};

function repeatKeyOf(recurrence?: Recurrence | null): RepeatKey {
  if (!recurrence) return "none";
  if (recurrence.freq === "weekly") return recurrence.interval === 2 ? "biweekly" : "weekly";
  return recurrence.freq;
}

function recurrenceOf(key: RepeatKey, until: string): Recurrence | null {
  if (key === "none") return null;
  const base =
    key === "daily"
      ? { freq: "daily" as const, interval: 1 }
      : key === "monthly"
        ? { freq: "monthly" as const, interval: 1 }
        : { freq: "weekly" as const, interval: key === "biweekly" ? 2 : 1 };
  return { ...base, until: until || null };
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  meeting?: Meeting | null;
  // começo da ocorrência que foi clicada (para cancelar só ela)
  occurrenceStartsAt?: string | null;
  defaultDate?: Date | null;
}

export function MeetingDialog({
  open,
  onOpenChange,
  projectId,
  meeting,
  occurrenceStartsAt,
  defaultDate,
}: MeetingDialogProps) {
  // `meeting`/`defaultDate` só importam no instante em que o diálogo abre —
  // o componente pai troca a `key` a cada abertura para reiniciar o formulário.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MeetingForm
          projectId={projectId}
          meeting={meeting}
          occurrenceStartsAt={occurrenceStartsAt}
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
  occurrenceStartsAt,
  defaultDate,
  onOpenChange,
}: Omit<MeetingDialogProps, "open">) {
  const { addMeeting, updateMeeting, deleteMeeting, skipOccurrence } = useStore();
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
  const [repeat, setRepeat] = React.useState<RepeatKey>(repeatKeyOf(meeting?.recurrence));
  const [until, setUntil] = React.useState(meeting?.recurrence?.until ?? "");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const isSeries = Boolean(meeting?.recurrence);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const startsAt = combine(date, startTime);
    const endsAt = endTime ? combine(date, endTime) : null;

    if (meeting) {
      updateMeeting(meeting.id, {
        title,
        startsAt,
        endsAt,
        location,
        notes,
        recurrence: recurrenceOf(repeat, until),
      });
      toast.success("Reunião atualizada");
    } else {
      addMeeting({
        projectId,
        title,
        startsAt,
        endsAt,
        location,
        notes,
        recurrence: recurrenceOf(repeat, until),
      });
      toast.success("Reunião marcada");
    }
    onOpenChange(false);
  }

  function handleDelete() {
    if (!meeting) return;
    // Em reunião recorrente, primeiro pergunta se é só esta ou toda a série.
    if (meeting.recurrence && !confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMeeting(meeting.id);
    onOpenChange(false);
  }

  function handleSkipOne() {
    if (!meeting || !occurrenceStartsAt) return;
    skipOccurrence(meeting.id, occurrenceStartsAt);
    toast.success("Reunião cancelada neste dia");
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting-date">{isSeries ? "Data da primeira reunião" : "Data"}</Label>
          <Input
            id="meeting-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meeting-repeat">Repetição</Label>
            <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatKey)}>
              <SelectTrigger id="meeting-repeat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPEAT_LABEL).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {repeat !== "none" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-until">Repetir até</Label>
              <Input
                id="meeting-until"
                type="date"
                min={date}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
          )}
        </div>
        {isSeries && (
          <p className="-mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Repeat className="mt-0.5 size-3 shrink-0" />
            Alterações valem para todas as reuniões desta série.
          </p>
        )}

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

        {confirmingDelete ? (
          <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col sm:items-stretch">
            <p className="text-sm text-muted-foreground">Esta reunião se repete. O que excluir?</p>
            <Button type="button" variant="outline" onClick={handleSkipOne} disabled={!occurrenceStartsAt}>
              Só esta reunião
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Todas as reuniões da série
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Voltar
            </Button>
          </DialogFooter>
        ) : (
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
        )}
      </form>
    </>
  );
}
