import { startOfDay } from "date-fns";

// Prazos de card são datas (sem hora). Guardamos o meio-dia no fuso de quem salvou, para o dia
// não "escorregar" para o anterior/seguinte em outro fuso.
export function dueIsoFromInput(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

// Prazos antigos foram salvos como meia-noite UTC ("2026-10-15T00:00:00.000Z"), que no Brasil
// aparece como o dia anterior. Nesse caso, usa-se o dia que estava escrito.
export function dueDateOf(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(iso);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return new Date(iso);
}

export function dueInputValue(iso: string): string {
  const d = dueDateOf(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Atrasado = o dia do prazo já passou (um prazo de hoje ainda não está atrasado).
export function isOverdue(iso: string | null | undefined, now = new Date()): boolean {
  return Boolean(iso) && dueDateOf(iso as string) < startOfDay(now);
}
