import { rrule } from "@/lib/ics";
import type { Recurrence } from "@/lib/types";

interface GoogleCalendarEventInput {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  notes?: string;
  recurrence?: Recurrence | null;
}

function toGoogleDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function googleCalendarUrl({
  title,
  startsAt,
  endsAt,
  location,
  notes,
  recurrence,
}: GoogleCalendarEventInput): string {
  const end = endsAt ?? new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleDate(startsAt)}/${toGoogleDate(end)}`,
  });
  if (notes) params.set("details", notes);
  if (location) params.set("location", location);
  const rule = rrule({ recurrence });
  if (rule) params.set("recur", `RRULE:${rule}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
