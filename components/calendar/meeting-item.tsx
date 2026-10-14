"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, Download, MapPin, Repeat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { cn } from "@/lib/utils";
import { googleMapsSearchUrl } from "@/lib/google-maps";
import { downloadIcs, icsFilename } from "@/lib/ics";
import { describeRecurrence, type Occurrence } from "@/lib/recurrence";

export function MeetingItem({ occurrence, onClick }: { occurrence: Occurrence; onClick: () => void }) {
  const { meeting } = occurrence;
  const start = new Date(occurrence.startsAt);

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-start sm:gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-secondary py-1.5">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {format(start, "MMM", { locale: ptBR })}
          </span>
          <span className="text-lg font-semibold leading-none">{format(start, "d")}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium wrap-anywhere">{meeting.title}</span>
          <span className="text-xs text-muted-foreground">
            {format(start, "EEEE, HH:mm", { locale: ptBR })}
          </span>
          {meeting.recurrence && (
            <span className="flex max-w-full items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="size-3 shrink-0" />
              {describeRecurrence(meeting.recurrence, new Date(meeting.startsAt))}
            </span>
          )}
          {meeting.location && (
            <a
              href={googleMapsSearchUrl(meeting.location)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Buscar no Google Maps"
              className="flex max-w-full items-start gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              <MapPin className="mt-0.5 size-3 shrink-0" />
              <span className="min-w-0 line-clamp-2 wrap-anywhere">{meeting.location}</span>
            </a>
          )}
          {meeting.notes && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground wrap-anywhere">{meeting.notes}</p>
          )}
        </div>
      </div>

      <MeetingActions meeting={meeting} className="flex shrink-0 self-end sm:self-start" />
    </div>
  );
}

// Baixar .ics e adicionar ao Google Agenda. No celular ficam embaixo do texto, à direita (sobra
// largura para o título); a partir de telas médias, na lateral.
function MeetingActions({ meeting, className }: { meeting: Occurrence["meeting"]; className?: string }) {
  return (
    <div className={cn("items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        title="Baixar para Apple Calendar, Outlook e outros (.ics)"
        aria-label="Baixar arquivo .ics"
        onClick={(e) => {
          e.stopPropagation();
          downloadIcs([meeting], icsFilename(meeting.title), meeting.title);
        }}
      >
        <Download className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="shrink-0" asChild>
        <a
          href={googleCalendarUrl(meeting)}
          target="_blank"
          rel="noopener noreferrer"
          title="Adicionar ao Google Agenda"
          aria-label="Adicionar ao Google Agenda"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPlus className="size-4" />
        </a>
      </Button>
    </div>
  );
}
