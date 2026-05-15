import type { AppointmentArrivalState, AppointmentRecord } from "@ozilcuts/types";
import { isAutoCheckInTimeWindow } from "@/lib/appointment-arrival";
import { hasShopCoordinates, isGeolocationAvailable } from "@/lib/geofence-arrival";

export const CHECK_IN_LIVE_SYNC_POLL_MS = 18_000;

export type CheckInMethod = "tap" | "qr" | "auto";

export function formatCheckInSyncTime(
  ms: number | null,
  nowMs: number = Date.now(),
): string {
  if (ms == null) return "";
  const diff = Math.max(0, nowMs - ms);
  if (diff < 15_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function canOfferAutoCheckIn(
  appointment: AppointmentRecord,
  arrivalLocationOptIn: boolean | null,
): boolean {
  return (
    arrivalLocationOptIn === true &&
    hasShopCoordinates(appointment) &&
    isGeolocationAvailable() &&
    isAutoCheckInTimeWindow(appointment)
  );
}

export function checkInMethodHint(
  method: CheckInMethod,
  mode: "customer" | "staff",
): string {
  if (mode === "staff") {
    return "Guest can tap, scan the QR, or use automatic check-in when nearby.";
  }
  switch (method) {
    case "auto":
      return "We checked you in automatically when you were near the studio.";
    case "qr":
      return "Opened via QR — you are on the board.";
    default:
      return "You checked in with one tap.";
  }
}

export function waitingLoungeHeadline(
  guestsAhead: number,
  chairMinutes: number | null,
): string {
  if (guestsAhead > 0 && chairMinutes != null && chairMinutes > 0) {
    return guestsAhead === 1
      ? `About ${chairMinutes} min of chair time before you — one guest ahead.`
      : `About ${chairMinutes} min of chair time before you — ${guestsAhead} ahead in line.`;
  }
  if (guestsAhead > 0) {
    return guestsAhead === 1
      ? "One guest is ahead of you in today's flow."
      : `${guestsAhead} guests are ahead of you in today's flow.`;
  }
  if (chairMinutes != null && chairMinutes > 0) {
    return `Roughly ${chairMinutes} minutes of chair time ahead — timing stays flexible.`;
  }
  return "You are on the list — we will call you when the chair is ready.";
}

export function isArrivalStateAdvance(
  prev: AppointmentArrivalState,
  next: AppointmentArrivalState,
): boolean {
  const order: AppointmentArrivalState[] = [
    "expected",
    "arrived",
    "waiting",
    "in_chair",
  ];
  return order.indexOf(next) > order.indexOf(prev);
}
