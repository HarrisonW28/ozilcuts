import { deriveOperationalStatus } from "@/lib/shop-live-status";
import type {
  AppointmentArrivalState,
  AppointmentRecord,
  AuthUser,
} from "@ozilcuts/types";

export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startLocalYmd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localYmd(d);
}

export function formatStart(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatStartTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isPastStart(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function sortByStart(
  a: AppointmentRecord,
  b: AppointmentRecord,
): number {
  const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
  return ta - tb;
}

export function splitTodayAndLater(
  rows: AppointmentRecord[],
): { today: AppointmentRecord[]; later: AppointmentRecord[] } {
  const ymdToday = localYmd(new Date());
  const todayList: AppointmentRecord[] = [];
  const laterList: AppointmentRecord[] = [];
  for (const r of rows) {
    const ymd = startLocalYmd(r.starts_at);
    if (ymd === ymdToday) todayList.push(r);
    else if (ymd && ymd > ymdToday) laterList.push(r);
  }
  todayList.sort(sortByStart);
  laterList.sort(sortByStart);
  return { today: todayList, later: laterList.slice(0, 10) };
}

export function canSendRunningLateNotice(
  row: AppointmentRecord,
  user: AuthUser,
): boolean {
  if (row.status !== "confirmed" || !row.ends_at) return false;
  const endMs = new Date(row.ends_at).getTime();
  if (Number.isNaN(endMs) || endMs <= Date.now()) return false;
  if (row.barber?.id !== user.id) return false;
  return true;
}

const ARRIVAL_NEXT: Record<
  AppointmentArrivalState,
  AppointmentArrivalState | null
> = {
  expected: "arrived",
  arrived: "waiting",
  waiting: "in_chair",
  in_chair: null,
};

export function nextArrivalState(
  current: AppointmentArrivalState,
): AppointmentArrivalState | null {
  return ARRIVAL_NEXT[current] ?? null;
}

export function arrivalActionLabel(
  current: AppointmentArrivalState,
): string | null {
  switch (current) {
    case "expected":
      return "Mark arrived";
    case "arrived":
      return "Seat in waiting";
    case "waiting":
      return "In the chair";
    default:
      return null;
  }
}

/** Guest the barber should focus on right now. */
export function pickNowFocus(
  today: AppointmentRecord[],
  nowMs: number,
): AppointmentRecord | null {
  const active = today.filter(
    (r) => r.status === "confirmed" && !isPastStart(r.starts_at),
  );
  if (active.length === 0) return null;

  const inChair = active.find((r) => r.arrival_state === "in_chair");
  if (inChair) return inChair;

  const waiting = active.find(
    (r) => r.arrival_state === "waiting" || r.arrival_state === "arrived",
  );
  if (waiting) return waiting;

  const onDeck = active.find((r) => {
    const s = deriveOperationalStatus(r, nowMs);
    return s === "on_deck" || s === "behind_schedule";
  });
  if (onDeck) return onDeck;

  return active.sort(sortByStart)[0] ?? null;
}

export type ReferencePreview = {
  appointmentId: number;
  customerName: string;
  serviceName: string;
  startsAt: string | null;
  photoUrl: string | null;
};

export function buildReferencePreviews(
  rows: AppointmentRecord[],
  thumbs: Record<number, string | null>,
  limit = 8,
): ReferencePreview[] {
  const out: ReferencePreview[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      appointmentId: row.id,
      customerName: row.customer?.name ?? "Customer",
      serviceName: row.service?.name ?? "Cut",
      startsAt: row.starts_at,
      photoUrl: thumbs[row.id] ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
