import type {
  BarberAvailabilityDay,
  BarberAvailabilityTimeWindow,
} from "@ozilcuts/types";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";

export type WeeklyHoursRow = {
  dayLabel: string;
  hoursLabel: string;
  isClosed: boolean;
};

/** Format API window times (`09:00`, `09:00:00`) for display. */
export function formatAvailabilityClockTime(raw: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!match) return raw.trim();

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw.trim();

  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function windowSignature(windows: BarberAvailabilityTimeWindow[]): string {
  if (windows.length === 0) return "__closed__";
  return windows
    .map((w) => `${w.starts_at.slice(0, 8)}-${w.ends_at.slice(0, 8)}`)
    .join("|");
}

function formatDayWindows(windows: BarberAvailabilityTimeWindow[]): {
  hoursLabel: string;
  isClosed: boolean;
} {
  if (windows.length === 0) {
    return { hoursLabel: "Closed", isClosed: true };
  }
  return {
    hoursLabel: windows
      .map(
        (w) =>
          `${formatAvailabilityClockTime(w.starts_at)} – ${formatAvailabilityClockTime(w.ends_at)}`,
      )
      .join(", "),
    isClosed: false,
  };
}

/** Collapse consecutive days that share the same hours into compact ranges. */
export function buildWeeklyHoursRows(
  weekdays: BarberAvailabilityDay[],
): WeeklyHoursRow[] {
  const byWeekday = new Map(
    weekdays.map((d) => [d.weekday, d.windows] as const),
  );

  const days = BARBER_WEEKDAY_LABELS.map((dayName, weekday) => {
    const windows = byWeekday.get(weekday) ?? [];
    const { hoursLabel, isClosed } = formatDayWindows(windows);
    return {
      dayName,
      hoursLabel,
      isClosed,
      sig: windowSignature(windows),
    };
  });

  const rows: WeeklyHoursRow[] = [];
  let i = 0;
  while (i < days.length) {
    let j = i + 1;
    while (j < days.length && days[j].sig === days[i].sig) j += 1;

    const start = days[i].dayName;
    const end = days[j - 1].dayName;
    rows.push({
      dayLabel: i === j - 1 ? start : `${start} – ${end}`,
      hoursLabel: days[i].hoursLabel,
      isClosed: days[i].isClosed,
    });
    i = j;
  }

  return rows;
}
