import type {
  AppointmentArrivalState,
  AppointmentRecord,
} from "@ozilcuts/types";

export type OperationalStatus =
  | "scheduled"
  | "on_deck"
  | "checked_in"
  | "waiting_room"
  | "in_service"
  | "behind_schedule"
  | "wrapped_up"
  | "cancelled";

const GRACE_BEHIND_MS = 7 * 60 * 1000;

function endMs(a: AppointmentRecord): number | null {
  if (a.ends_at) {
    const t = new Date(a.ends_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (!a.starts_at) return null;
  const start = new Date(a.starts_at).getTime();
  if (Number.isNaN(start)) return null;
  const dur = (a.service?.duration_minutes ?? 30) * 60_000;
  return start + dur;
}

function startMs(a: AppointmentRecord): number | null {
  if (!a.starts_at) return null;
  const t = new Date(a.starts_at).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Single source of truth for barber/customer-facing operational labels.
 * Calm copy: “behind schedule” instead of alarmist language.
 */
export function deriveOperationalStatus(
  appointment: AppointmentRecord,
  nowMs: number,
): OperationalStatus {
  if (appointment.status === "cancelled") return "cancelled";

  const end = endMs(appointment);
  const start = startMs(appointment);
  if (end !== null && nowMs >= end) return "wrapped_up";

  const arrival = appointment.arrival_state as AppointmentArrivalState;

  if (arrival === "in_chair") return "in_service";
  if (arrival === "waiting") return "waiting_room";
  if (arrival === "arrived") return "checked_in";

  if (start !== null && nowMs >= start && nowMs < start + GRACE_BEHIND_MS) {
    return "on_deck";
  }

  if (
    start !== null &&
    end !== null &&
    nowMs > start + GRACE_BEHIND_MS &&
    nowMs < end &&
    arrival === "expected"
  ) {
    return "behind_schedule";
  }

  if (
    start !== null &&
    end !== null &&
    nowMs >= start &&
    nowMs < end &&
    arrival === "expected"
  ) {
    return "in_service";
  }

  return "scheduled";
}

export function operationalStatusMeta(status: OperationalStatus): {
  label: string;
  short: string;
  tone: "neutral" | "info" | "attention" | "success" | "muted";
} {
  switch (status) {
    case "cancelled":
      return { label: "Cancelled", short: "Off", tone: "muted" };
    case "wrapped_up":
      return { label: "Completed", short: "Done", tone: "muted" };
    case "in_service":
      return { label: "In the chair", short: "Chair", tone: "success" };
    case "waiting_room":
      return { label: "Waiting", short: "Wait", tone: "info" };
    case "checked_in":
      return { label: "Checked in", short: "Here", tone: "info" };
    case "on_deck":
      return { label: "On deck", short: "Deck", tone: "info" };
    case "behind_schedule":
      return {
        label: "Catching up on time",
        short: "Ease",
        tone: "attention",
      };
    case "scheduled":
    default:
      return { label: "Scheduled", short: "Booked", tone: "neutral" };
  }
}

/** Today’s visits sorted by start time (confirmed only). */
export function sortTodayConfirmedQueue(
  appointments: AppointmentRecord[],
  todayYmd: string,
): AppointmentRecord[] {
  const list: AppointmentRecord[] = [];
  for (const a of appointments) {
    if (a.status !== "confirmed" || !a.starts_at) continue;
    const d = new Date(a.starts_at);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (`${y}-${m}-${day}` !== todayYmd) continue;
    list.push(a);
  }
  list.sort((a, b) => {
    const ta = startMs(a) ?? 0;
    const tb = startMs(b) ?? 0;
    return ta - tb;
  });
  return list;
}

/**
 * Rough minutes of chair time still ahead of this booking (sum of unfinished
 * cuts before it in the day queue). For calm “~20 min” hints, not precision.
 */
export function estimateMinutesAheadInQueue(
  queue: AppointmentRecord[],
  targetId: number,
  nowMs: number,
): number | null {
  const idx = queue.findIndex((a) => a.id === targetId);
  if (idx <= 0) return null;
  let minutes = 0;
  for (let j = 0; j < idx; j++) {
    const a = queue[j];
    const end = endMs(a);
    const st = startMs(a);
    if (end === null || st === null) continue;
    if (end <= nowMs) continue;
    const dur = a.service?.duration_minutes ?? 30;
    if (nowMs < st) minutes += dur;
    else minutes += Math.max(1, Math.ceil((end - nowMs) / 60_000));
  }
  return minutes > 0 ? Math.min(240, minutes) : null;
}

export function minutesUntilStart(
  appointment: AppointmentRecord,
  nowMs: number,
): number | null {
  const st = startMs(appointment);
  if (st === null) return null;
  const diff = Math.ceil((st - nowMs) / 60_000);
  if (diff <= 0) return null;
  return diff;
}

export function findServingAppointment(
  queue: AppointmentRecord[],
  nowMs: number,
): AppointmentRecord | null {
  for (const a of queue) {
    if (a.arrival_state === "in_chair") return a;
    const st = startMs(a);
    const en = endMs(a);
    if (st !== null && en !== null && nowMs >= st && nowMs < en) {
      return a;
    }
  }
  return null;
}

export function countWaitingAhead(
  queue: AppointmentRecord[],
  targetId: number,
  nowMs: number,
): number {
  const idx = queue.findIndex((a) => a.id === targetId);
  if (idx <= 0) return 0;
  let n = 0;
  for (let j = 0; j < idx; j++) {
    const s = deriveOperationalStatus(queue[j], nowMs);
    if (
      s === "checked_in" ||
      s === "waiting_room" ||
      s === "on_deck" ||
      s === "behind_schedule"
    ) {
      n += 1;
    }
  }
  return n;
}

export type LiveShopSummary = {
  serving: AppointmentRecord | null;
  waitingCount: number;
  behindCount: number;
  next: AppointmentRecord | null;
  nextStartsInMinutes: number | null;
};

/** Calm wait copy — avoids false precision. */
export function formatCalmWaitEstimate(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 5) return "A few minutes";
  if (minutes <= 20) return `About ${minutes} min`;
  return `Roughly ${minutes} min`;
}

export function isRunningLateStatus(status: OperationalStatus): boolean {
  return status === "behind_schedule";
}

export function buildLiveShopSummary(
  queue: AppointmentRecord[],
  nowMs: number,
): LiveShopSummary {
  const serving = findServingAppointment(queue, nowMs);
  let waitingCount = 0;
  let behindCount = 0;
  for (const a of queue) {
    const s = deriveOperationalStatus(a, nowMs);
    if (s === "checked_in" || s === "waiting_room") waitingCount += 1;
    if (s === "behind_schedule") behindCount += 1;
  }
  let next: AppointmentRecord | null = null;
  for (const a of queue) {
    const st = startMs(a);
    if (st === null) continue;
    if (st <= nowMs) continue;
    if (deriveOperationalStatus(a, nowMs) === "wrapped_up") continue;
    next = a;
    break;
  }

  return {
    serving,
    waitingCount,
    behindCount,
    next,
    nextStartsInMinutes: next ? minutesUntilStart(next, nowMs) : null,
  };
}
