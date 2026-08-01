"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthCalendar({
  month,
  onMonthChange,
  meetings,
  selectedDay,
  onSelectDay,
}: {
  month: Date;
  onMonthChange: (date: Date) => void;
  meetings: Meeting[];
  selectedDay: Date | null;
  onSelectDay: (date: Date | null) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const meetingCountByDay = (day: Date) =>
    meetings.filter((m) => isSameDay(new Date(m.startsAt), day)).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(month, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((day, i) => (
          <span key={i} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const count = meetingCountByDay(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const inMonth = isSameMonth(day, month);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(selected ? null : day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-full text-sm transition-colors",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                selected && "bg-primary text-primary-foreground",
                !selected && isToday(day) && "font-semibold text-primary",
                !selected && "hover:bg-accent"
              )}
            >
              {format(day, "d")}
              {count > 0 && (
                <span
                  className={cn(
                    "size-1 rounded-full",
                    selected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
