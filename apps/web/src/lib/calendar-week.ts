import type { BarberAvailabilityPayload } from "@ozilcuts/types";

export type AvailabilityWindow = {
  starts_at: string;
  ends_at: string;
};

export type WeekDaySchedule = {
  date: Date;
  weekday: number;
  windows: AvailabilityWindow[];
};

/** Week starts Sunday (weekday 0), matching API / PHP `date('w')`. */
export function startOfWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const y: Intl.DateTimeFormatOptions = {
    ...opts,
    year: "numeric",
  };
  const a = new Intl.DateTimeFormat(undefined, opts).format(weekStart);
  const b = new Intl.DateTimeFormat(undefined, y).format(weekEnd);

  return `${a} – ${b}`;
}

export function formatShortWeekday(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

export function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function buildWeekDaysFromAvailability(
  weekStart: Date,
  payload: BarberAvailabilityPayload | null,
): WeekDaySchedule[] {
  const lookup = new Map(
    (payload?.weekdays ?? []).map((d) => [d.weekday, d.windows]),
  );

  return getWeekDays(weekStart).map((date) => ({
    date,
    weekday: date.getDay(),
    windows: lookup.get(date.getDay()) ?? [],
  }));
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => Number.parseInt(x, 10));
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;

  return safeH * 60 + safeM;
}
