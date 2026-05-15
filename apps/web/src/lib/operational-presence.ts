import type {
  AppointmentArrivalState,
  AppointmentRecord,
  NotificationRecord,
} from "@ozilcuts/types";

import { isOperationalAlertType } from "@/lib/notification-presenter";

/** Background sync with check-in poll — calm cadence, visible tab only. */
export const OPERATIONAL_PRESENCE_POLL_MS = 22_000;

/** Briefly hide the inbox alert strip after a floor digest so two surfaces do not stack. */
export const PRESENCE_DIGEST_ALERT_COOLDOWN_MS = 90_000;

export type FloorPresenceCounts = {
  expected: number;
  checkedIn: number;
  waiting: number;
  inChair: number;
};

export type FloorPresenceGuest = {
  appointmentId: number;
  name: string;
  state: AppointmentArrivalState;
  serviceName: string | null;
  startsAt: string | null;
};

/**
 * One calm line when arrival states move forward between polls (barber home).
 */
export function buildOperationalArrivalDigest(
  prev: AppointmentRecord[],
  next: AppointmentRecord[],
): string | null {
  const prevMap = new Map<number, AppointmentArrivalState>();
  for (const a of prev) {
    prevMap.set(a.id, a.arrival_state);
  }

  const messages: string[] = [];

  for (const a of next) {
    const before = prevMap.get(a.id);
    if (before === undefined || before === a.arrival_state) continue;

    const name = a.customer?.name?.trim() || "Guest";

    if (before === "expected" && a.arrival_state === "arrived") {
      messages.push(`${name} checked in`);
    } else if (before === "expected" && a.arrival_state === "waiting") {
      messages.push(`${name} is waiting`);
    } else if (before === "expected" && a.arrival_state === "in_chair") {
      messages.push(`${name} seated`);
    } else if (before === "arrived" && a.arrival_state === "waiting") {
      messages.push(`${name} moved to waiting`);
    } else if (before === "arrived" && a.arrival_state === "in_chair") {
      messages.push(`${name} in the chair`);
    } else if (before === "waiting" && a.arrival_state === "in_chair") {
      messages.push(`${name} in the chair`);
    }
  }

  if (messages.length === 0) return null;
  if (messages.length === 1) return messages[0];
  if (messages.length === 2) return `${messages[0]} · ${messages[1]}`;
  return `${messages[0]} · +${messages.length - 1} more`;
}

export function countFloorPresence(
  todayQueue: AppointmentRecord[],
): FloorPresenceCounts {
  const counts: FloorPresenceCounts = {
    expected: 0,
    checkedIn: 0,
    waiting: 0,
    inChair: 0,
  };
  for (const a of todayQueue) {
    switch (a.arrival_state) {
      case "arrived":
        counts.checkedIn += 1;
        break;
      case "waiting":
        counts.waiting += 1;
        break;
      case "in_chair":
        counts.inChair += 1;
        break;
      default:
        counts.expected += 1;
    }
  }
  return counts;
}

export function floorPresenceGuests(
  todayQueue: AppointmentRecord[],
): FloorPresenceGuest[] {
  return todayQueue
    .filter((a) =>
      ["arrived", "waiting", "in_chair"].includes(a.arrival_state),
    )
    .map((a) => ({
      appointmentId: a.id,
      name: a.customer?.name?.trim() || "Guest",
      state: a.arrival_state,
      serviceName: a.service?.name ?? null,
      startsAt: a.starts_at,
    }));
}

/**
 * Prefer check-in over nearby for the same appointment so barbers do not get doubled arrival noise.
 */
export function pickPriorityOperationalAlert(
  records: NotificationRecord[],
): NotificationRecord | null {
  const unread = records.filter(
    (n) => n.read_at === null && isOperationalAlertType(n.type),
  );
  if (unread.length === 0) return null;

  const byAppointment = new Map<number, NotificationRecord[]>();
  for (const n of unread) {
    const aid = n.data.appointment_id;
    if (typeof aid !== "number" || aid <= 0) continue;
    if (!byAppointment.has(aid)) byAppointment.set(aid, []);
    byAppointment.get(aid)!.push(n);
  }

  const deduped: NotificationRecord[] = [];
  for (const batch of byAppointment.values()) {
    const sorted = [...batch].sort((a, b) => b.id - a.id);
    const checkIn = sorted.find((n) => n.type === "staff.arrival_checked_in");
    const nearby = sorted.find((n) => n.type === "staff.arrival_nearby");
    if (checkIn) {
      deduped.push(checkIn);
    } else if (nearby) {
      deduped.push(nearby);
    } else {
      deduped.push(sorted[0]!);
    }
  }

  const orphans = unread.filter((n) => {
    const aid = n.data.appointment_id;
    return typeof aid !== "number" || aid <= 0;
  });

  const pool = [...deduped, ...orphans].sort((a, b) => b.id - a.id);
  return pool[0] ?? null;
}

export function shouldSuppressOperationalAlerts(
  digestMessage: string | null,
  digestShownAtMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (!digestMessage || digestShownAtMs == null) return false;
  return nowMs - digestShownAtMs < PRESENCE_DIGEST_ALERT_COOLDOWN_MS;
}
