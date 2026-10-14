import { format } from "date-fns";

import type { Meeting } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

function utc(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Linhas do iCalendar têm no máximo 75 caracteres; as seguintes começam com um espaço.
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function rrule(meeting: Pick<Meeting, "recurrence">): string | null {
  const r = meeting.recurrence;
  if (!r) return null;
  const freq = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" }[r.freq];
  let rule = `FREQ=${freq};INTERVAL=${Math.max(1, r.interval)}`;
  if (r.until) rule += `;UNTIL=${r.until.replace(/-/g, "")}T235959Z`;
  return rule;
}

export function meetingsToIcs(meetings: Meeting[], calendarName = "Palco"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Palco//Reunioes//PT-BR",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const stamp = utc(new Date().toISOString());
  for (const m of meetings) {
    const end = m.endsAt ?? new Date(new Date(m.startsAt).getTime() + 60 * 60 * 1000).toISOString();
    lines.push("BEGIN:VEVENT", `UID:${m.id}@palco`, `DTSTAMP:${stamp}`, `DTSTART:${utc(m.startsAt)}`, `DTEND:${utc(end)}`);
    lines.push(`SUMMARY:${escapeText(m.title)}`);
    if (m.location) lines.push(`LOCATION:${escapeText(m.location)}`);
    if (m.notes) lines.push(`DESCRIPTION:${escapeText(m.notes)}`);
    const rule = rrule(m);
    if (rule) {
      lines.push(`RRULE:${rule}`);
      for (const ex of m.exceptions ?? []) lines.push(`EXDATE:${utc(ex)}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(meetings: Meeting[], filename: string, calendarName?: string) {
  const blob = new Blob([meetingsToIcs(meetings, calendarName)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function icsFilename(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "reuniao"}-${format(new Date(), "yyyyMMdd")}.ics`;
}
