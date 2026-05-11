import type {
  BarberAvailabilityDay,
  BarberAvailabilityPayload,
  BarberAvailabilityWindowInput,
} from "@ozilcuts/types";

/** Mon–Fri 9–5 when the shop has not saved defaults yet. */
export function defaultShopHoursWeekdays(): BarberAvailabilityDay[] {
  return buildShopHoursFromQuickSelection(
    new Set([1, 2, 3, 4, 5]),
    "09:00",
    "17:00",
  );
}

export function buildShopHoursFromQuickSelection(
  selected: Set<number>,
  openHtmlTime: string,
  closeHtmlTime: string,
): BarberAvailabilityDay[] {
  const starts = normalizeTimeForStorage(openHtmlTime);
  const ends = normalizeTimeForStorage(closeHtmlTime);
  const sorted = Array.from(selected).sort((a, b) => a - b);
  return sorted.map((weekday) => ({
    weekday,
    windows: [{ starts_at: starts, ends_at: ends }],
  }));
}

function normalizeTimeForStorage(htmlTime: string): string {
  const t = htmlTime.trim();
  if (t.length >= 8) return t;
  if (t.length === 5) return `${t}:00`;
  return `${t.slice(0, 5)}:00`;
}

export function weekdaysFromShopAdminPayload(
  payload: BarberAvailabilityPayload | null | undefined,
): BarberAvailabilityDay[] {
  const wd = payload?.weekdays;
  if (!wd?.length) {
    return defaultShopHoursWeekdays();
  }
  const hasWindow = wd.some((d) => d.windows.length > 0);
  if (!hasWindow) {
    return defaultShopHoursWeekdays();
  }
  return wd.map((d) => ({
    weekday: d.weekday,
    windows: d.windows.map((w) => ({
      starts_at: normalizeTimeForStorage(w.starts_at),
      ends_at: normalizeTimeForStorage(w.ends_at),
    })),
  }));
}

/** Stable signature for comparing shop hours without relying on array identity. */
export function shopHoursWeekdaysSignature(days: BarberAvailabilityDay[]): string {
  return JSON.stringify(flattenShopHoursWeekdaysToPayload(days));
}

export function flattenShopHoursWeekdaysToPayload(
  days: BarberAvailabilityDay[],
): BarberAvailabilityWindowInput[] {
  const out: BarberAvailabilityWindowInput[] = [];
  for (const d of days) {
    for (const w of d.windows) {
      out.push({
        weekday: d.weekday,
        starts_at: toApiTime(w.starts_at),
        ends_at: toApiTime(w.ends_at),
      });
    }
  }
  return out;
}

function toApiTime(v: string): string {
  return v.length >= 5 ? v.slice(0, 5) : v;
}

export function shopHoursHaveBookableWindows(
  days: BarberAvailabilityDay[],
): boolean {
  return days.some((d) => d.windows.length > 0);
}

export function quickSelectionFromWeekdays(days: BarberAvailabilityDay[]): {
  selected: Set<number>;
  open: string;
  close: string;
} {
  const active = days.filter((d) => d.windows.length > 0);
  if (active.length === 0) {
    return {
      selected: new Set([1, 2, 3, 4, 5]),
      open: "09:00",
      close: "17:00",
    };
  }
  const selected = new Set(active.map((d) => d.weekday));
  const first = active[0].windows[0];
  return {
    selected,
    open: first.starts_at.slice(0, 5),
    close: first.ends_at.slice(0, 5),
  };
}
