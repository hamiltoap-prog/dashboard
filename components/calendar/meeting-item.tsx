"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { googleCalendarUrl } from "@/lib/google-calendar";
import type { Meeting } from "@/lib/types";

export function MeetingItem({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const start = new Date(meeting.startsAt);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-start gap-3 text-left"
      >
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-secondary py-1.5">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {format(start, "MMM", { locale: ptBR })}
          </span>
          <span className="text-lg font-semibold leading-none">{format(start, "d")}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{meeting.title}</span>
          <span className="text-xs text-muted-foreground">
            {format(start, "EEEE, HH:mm", { locale: ptBR })}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {meeting.location}
            </span>
          )}
          {meeting.notes && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meeting.notes}</p>
          )}
        </div>
      </button>

      <Button variant="ghost" size="icon" className="shrink-0" asChild>
        <a
          href={googleCalendarUrl(meeting)}
          target="_blank"
          rel="noopener noreferrer"
          title="Adicionar ao Google Agenda"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPlus className="size-4" />
        </a>
      </Button>
    </div>
  );
}
