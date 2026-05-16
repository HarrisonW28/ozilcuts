import type {
  AppointmentRangeFilter,
  AppointmentRecord,
  AppointmentStatusFilter,
  Paginated,
} from "@ozilcuts/types";

const STORAGE_PREFIX = "ozilcuts_appts_snap_v1";

export type AppointmentsSnapshot = {
  savedAt: number;
  page: Paginated<AppointmentRecord>;
};

export function tokenSignature(token: string): string {
  if (token.length <= 32) return token;
  return `${token.slice(0, 14)}_${token.slice(-10)}`;
}

export function appointmentsCacheKey(
  page: number,
  range: AppointmentRangeFilter,
  status: AppointmentStatusFilter,
): string {
  return `${page}|${range}|${status}`;
}

function storageKey(sig: string, filtersKey: string): string {
  return `${STORAGE_PREFIX}:${sig}:${filtersKey}`;
}

export function writeAppointmentsSnapshot(
  sig: string,
  filtersKey: string,
  page: Paginated<AppointmentRecord>,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: AppointmentsSnapshot = { savedAt: Date.now(), page };
    sessionStorage.setItem(storageKey(sig, filtersKey), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readAppointmentsSnapshot(
  sig: string,
  filtersKey: string,
): AppointmentsSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(sig, filtersKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppointmentsSnapshot;
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !parsed.page ||
      !Array.isArray(parsed.page.data)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
