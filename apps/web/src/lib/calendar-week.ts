import type {
  AppointmentRecord,
  AppointmentStatus,
  BarberAvailabilityPayload,
} from "@ozilcuts/types";

/** Visible local-time window for barber timeline UIs (6:00a–10:00p). */
export const CALENDAR_GRID_START_MIN = 6 * 60;

export const CALENDAR_GRID_END_MIN = 22 * 60;

export const CALENDAR_GRID_SPAN_MIN =
  CALENDAR_GRID_END_MIN - CALENDAR_GRID_START_MIN;

export type AvailabilityWindow = {
  starts_at: string;
  ends_at: string;
};

export type BookingBlock = {
  id: number;
  /** Minute-of-day [0..1440]. */
  startMin: number;
  endMin: number;
  status: AppointmentStatus;
  label: string;
  href: string;
};

export type WeekDaySchedule = {
  date: Date;
  weekday: number;
  windows: AvailabilityWindow[];
  bookings: BookingBlock[];
};

/** Visual density for calendar timelines (stored in localStorage on barber calendar). */
export type CalendarDensity = "comfortable" | "compact";

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
    bookings: [],
  }));
}

function isoYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function formatYmd(date: Date): string {
  return isoYmd(date);
}

/**
 * Parse a YYYY-MM-DD value (e.g. from a native <input type="date">) into
 * a local-time Date. Returns null on malformed input rather than NaN so
 * callers can fall through to a safe default.
 */
export function parseYmdToDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map((p) => Number.parseInt(p, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);

  return date;
}

function bookingLabel(record: AppointmentRecord): string {
  const service = record.service?.name;
  const customer = record.customer?.name;
  if (service && customer) return `${service} · ${customer}`;
  return service ?? customer ?? "Appointment";
}

/**
 * Read the literal `YYYY-MM-DD` and `HH:mm` from an ISO-like API datetime string,
 * ignoring any `Z` / offset suffix. This keeps appointments aligned with
 * availability windows, which are plain shop wall-clock times — using `Date`
 * would shift times by the viewer's browser timezone when the payload carries
 * `Z` / UTC offsets.
 */
export function parseIsoWallClock(
  iso: string,
): { ymd: string; minuteOfDay: number } | null {
  const trimmed = iso.trim();
  const m = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/,
  );
  if (!m) return null;
  const ymd = m[1];
  const h = Number.parseInt(m[2], 10);
  const min = Number.parseInt(m[3], 10);
  if (
    !Number.isFinite(h) ||
    !Number.isFinite(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }

  return { ymd, minuteOfDay: h * 60 + min };
}

export type PlacedBooking = {
  booking: BookingBlock;
  column: number;
};

/**
 * Greedy column assignment for overlapping bookings (week columns + day timeline).
 */
export function placeBookings(bookings: BookingBlock[]): {
  placed: PlacedBooking[];
  columnCount: number;
} {
  if (bookings.length === 0) {
    return { placed: [], columnCount: 1 };
  }

  const sorted = [...bookings].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin,
  );

  const columnEnds: number[] = [];
  const placed: PlacedBooking[] = [];

  for (const booking of sorted) {
    let col = 0;
    while (col < columnEnds.length && columnEnds[col]! > booking.startMin) {
      col++;
    }
    if (col === columnEnds.length) {
      columnEnds.push(booking.endMin);
    } else {
      columnEnds[col] = booking.endMin;
    }
    placed.push({ booking, column: col });
  }

  return { placed, columnCount: Math.max(1, columnEnds.length) };
}

/**
 * Bucket booked appointments into the week grid by their local date, and
 * convert their start/end timestamps into minute-of-day offsets so the
 * calendar component can render them with the same percentage math it
 * already uses for availability windows.
 *
 * Bookings whose start or end falls outside the visible day are clipped
 * by the renderer; this helper just classifies which day they belong to.
 */
export function applyBookingsToSchedule(
  schedule: WeekDaySchedule[],
  appointments: AppointmentRecord[],
): WeekDaySchedule[] {
  const byDay = new Map<string, BookingBlock[]>();
  for (const appt of appointments) {
    if (!appt.starts_at || !appt.ends_at) continue;

    let key: string;
    let startMin: number;
    let endMin: number;

    const startWall = parseIsoWallClock(appt.starts_at);
    const endWall = parseIsoWallClock(appt.ends_at);

    if (startWall && endWall) {
      key = startWall.ymd;
      startMin = startWall.minuteOfDay;
      const sameDay = endWall.ymd === key;
      endMin = sameDay ? endWall.minuteOfDay : 24 * 60;
    } else {
      const start = new Date(appt.starts_at);
      const end = new Date(appt.ends_at);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      key = isoYmd(start);
      startMin = start.getHours() * 60 + start.getMinutes();
      const sameDay = isoYmd(end) === key;
      endMin = sameDay ? end.getHours() * 60 + end.getMinutes() : 24 * 60;
    }

    if (endMin <= startMin) continue;

    const block: BookingBlock = {
      id: appt.id,
      startMin,
      endMin,
      status: appt.status,
      label: bookingLabel(appt),
      href: `/appointments/${appt.id}/confirmation`,
    };

    const list = byDay.get(key);
    if (list) {
      list.push(block);
    } else {
      byDay.set(key, [block]);
    }
  }

  return schedule.map((day) => ({
    ...day,
    bookings: byDay.get(isoYmd(day.date)) ?? [],
  }));
}

export function isSameYmd(a: Date, b: Date): boolean {
  return isoYmd(a) === isoYmd(b);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => Number.parseInt(x, 10));
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;

  return safeH * 60 + safeM;
}
