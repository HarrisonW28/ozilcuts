import { formatCalmWaitEstimate } from "@/lib/shop-live-status";
import type {
  AppointmentQueueIntelligenceResponse,
  QueuePaceTone,
} from "@ozilcuts/types";

export const QUEUE_INTELLIGENCE_POLL_MS = 22_000;

export function queuePanelLabel(mode: "customer" | "staff"): string {
  return mode === "staff" ? "Visit flow" : "How things look";
}

/** Soft 0–100 hint for progress rail — not a countdown. */
export function queueProgressPercent(
  data: Pick<
    AppointmentQueueIntelligenceResponse,
    | "estimated_chair_minutes_ahead"
    | "guests_ahead_in_arrival"
    | "is_next_in_line"
  >,
): number | null {
  if (data.is_next_in_line) {
    return 92;
  }
  if (data.estimated_chair_minutes_ahead != null && data.estimated_chair_minutes_ahead > 0) {
    return Math.min(
      88,
      Math.max(8, Math.round((data.estimated_chair_minutes_ahead / 90) * 100)),
    );
  }
  if (data.guests_ahead_in_arrival > 0) {
    return Math.min(72, Math.max(10, 68 - data.guests_ahead_in_arrival * 14));
  }
  return null;
}

export function queueProgressCaption(
  progressPct: number | null,
  mode: "customer" | "staff",
): string {
  if (progressPct !== null) {
    return "Bar width is a soft hint from today’s schedule — real timing stays flexible.";
  }
  return mode === "staff"
    ? "No single-number wait right now — you are guiding the day calmly."
    : "No single-number wait right now — your barber is steering the day calmly.";
}

export function queuePaceIsBehind(
  paceTone: QueuePaceTone | undefined,
  visitsBehindSchedule: number,
): boolean {
  return paceTone === "behind" || visitsBehindSchedule > 0;
}

export function formatQueueSyncTime(
  lastSyncedAt: number,
  nowMs: number,
): string {
  const deltaSec = Math.max(0, Math.floor((nowMs - lastSyncedAt) / 1000));
  if (deltaSec < 12) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const mins = Math.floor(deltaSec / 60);
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  return "earlier today";
}

export function queueWaitHintLabel(
  estimatedMinutesAhead: number | null,
): string {
  return formatCalmWaitEstimate(estimatedMinutesAhead) ?? "Flexible today";
}

export function queueLinePositionLabel(
  guestsAhead: number,
  isNextInLine: boolean,
): string {
  if (isNextInLine || guestsAhead === 0) {
    return "You are next up";
  }
  if (guestsAhead === 1) {
    return "1 ahead";
  }
  return `${guestsAhead} ahead`;
}

/** Dots to show in position rail (capped for calm layout). */
export function queuePositionDotCount(
  guestsAhead: number,
  isNextInLine: boolean,
): number {
  if (isNextInLine) {
    return 1;
  }
  return Math.min(5, Math.max(1, guestsAhead + 1));
}
