import { addDays, addMonths, addWeeks, format } from "date-fns";

import type { Meeting, Recurrence } from "@/lib/types";

// Uma data concreta em que a reunião acontece (a reunião "base" pode se repetir várias vezes).
export interface Occurrence {
  meeting: Meeting;
  startsAt: string;
  endsAt: string | null;
  isRecurring: boolean;
}

const MAX_OCCURRENCES = 3000; // trava de segurança

function nth(start: Date, recurrence: Recurrence, n: number): Date {
  const step = Math.max(1, recurrence.interval) * n;
  // Sempre calculado a partir da primeira data, para o dia do mês não "escorregar" (31 → 28 → 28...).
  if (recurrence.freq === "daily") return addDays(start, step);
  if (recurrence.freq === "weekly") return addWeeks(start, step);
  return addMonths(start, step);
}

// Ocorrências que começam entre `from` (inclusive) e `to` (exclusive).
export function occurrencesBetween(meeting: Meeting, from: Date, to: Date): Occurrence[] {
  const start = new Date(meeting.startsAt);
  const duration = meeting.endsAt ? new Date(meeting.endsAt).getTime() - start.getTime() : null;
  const make = (date: Date): Occurrence => ({
    meeting,
    startsAt: date.toISOString(),
    endsAt: duration === null ? null : new Date(date.getTime() + duration).toISOString(),
    isRecurring: Boolean(meeting.recurrence),
  });

  const recurrence = meeting.recurrence;
  if (!recurrence) return start >= from && start < to ? [make(start)] : [];

  const skipped = new Set(meeting.exceptions ?? []);
  const result: Occurrence[] = [];
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const date = nth(start, recurrence, n);
    if (date >= to) break;
    if (recurrence.until && format(date, "yyyy-MM-dd") > recurrence.until) break;
    if (date < from || skipped.has(date.toISOString())) continue;
    result.push(make(date));
  }
  return result;
}

export function occurrencesOf(meetings: Meeting[], from: Date, to: Date): Occurrence[] {
  return meetings
    .flatMap((m) => occurrencesBetween(m, from, to))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// As próximas `limit` ocorrências a partir de `now` (procura até ~2 anos à frente).
export function nextOccurrences(meetings: Meeting[], now: Date, limit: number): Occurrence[] {
  return occurrencesOf(meetings, now, addDays(now, 730)).slice(0, limit);
}

const EVERY_WEEKDAY = [
  "Todo domingo",
  "Toda segunda-feira",
  "Toda terça-feira",
  "Toda quarta-feira",
  "Toda quinta-feira",
  "Toda sexta-feira",
  "Todo sábado",
];

export function describeRecurrence(recurrence: Recurrence, start: Date): string {
  const n = Math.max(1, recurrence.interval);
  let text: string;
  if (recurrence.freq === "daily") text = n === 1 ? "Todo dia" : `A cada ${n} dias`;
  else if (recurrence.freq === "weekly") text = n === 1 ? EVERY_WEEKDAY[start.getDay()] : `A cada ${n} semanas`;
  else text = n === 1 ? `Todo dia ${start.getDate()} do mês` : `A cada ${n} meses`;
  if (recurrence.until) {
    const [y, m, d] = recurrence.until.split("-");
    text += `, até ${d}/${m}/${y}`;
  }
  return text;
}
