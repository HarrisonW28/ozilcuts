import type {
  AppointmentArrivalState,
  AppointmentRecord,
} from "@ozilcuts/types";

/** Mirrors `AppointmentPolicy::inArrivalWindow` (36h before start → 60m after end). */
export function isAppointmentArrivalWindowOpen(
  appointment: AppointmentRecord,
): boolean {
  if (appointment.status !== "confirmed") return false;
  const start = appointment.starts_at ? Date.parse(appointment.starts_at) : NaN;
  const end = appointment.ends_at ? Date.parse(appointment.ends_at) : NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const now = Date.now();
  const windowStart = start - 36 * 60 * 60 * 1000;
  const windowEnd = end + 60 * 60 * 1000;
  return now >= windowStart && now <= windowEnd;
}

/**
 * Narrower window for geofence-triggered auto check-in: avoids accidental
 * check-in from early visits while still covering travel day + overrun.
 * 90m before start → 45m after scheduled end.
 */
export function isAutoCheckInTimeWindow(
  appointment: AppointmentRecord,
): boolean {
  if (appointment.status !== "confirmed") return false;
  const start = appointment.starts_at ? Date.parse(appointment.starts_at) : NaN;
  const end = appointment.ends_at ? Date.parse(appointment.ends_at) : NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const now = Date.now();
  const windowStart = start - 90 * 60 * 1000;
  const windowEnd = end + 45 * 60 * 1000;
  return now >= windowStart && now <= windowEnd;
}

export function arrivalStateLabel(state: AppointmentArrivalState): string {
  switch (state) {
    case "expected":
      return "Expected";
    case "arrived":
      return "Arrived";
    case "waiting":
      return "Waiting";
    case "in_chair":
      return "In chair";
    default:
      return state;
  }
}

export function arrivalStateDescription(
  state: AppointmentArrivalState,
): string {
  switch (state) {
    case "expected":
      return "Head to the shop when it is time. If location sharing is on, we can check you in automatically when you are close — or tap the button the moment you walk in.";
    case "arrived":
      return "You are on the board. Have a seat nearby; your barber will seat you when the chair is ready.";
    case "waiting":
      return "You are in the queue. Relax nearby — this page refreshes on its own so you will see the moment you are called to the chair.";
    case "in_chair":
      return "Enjoy the session — your barber has you in the chair.";
    default:
      return "";
  }
}

/** Warm, hospitality-style headline for the check-in screen. */
export function arrivalHospitalityHeadline(
  state: AppointmentArrivalState,
  mode: "customer" | "staff",
): string {
  if (mode === "staff") {
    switch (state) {
      case "expected":
        return "Awaiting your guest";
      case "arrived":
        return "Guest has arrived";
      case "waiting":
        return "Guest is waiting";
      case "in_chair":
        return "Guest in the chair";
      default:
        return arrivalStateLabel(state);
    }
  }
  switch (state) {
    case "expected":
      return "We are ready for you";
    case "arrived":
      return "Welcome — you are checked in";
    case "waiting":
      return "Please take a seat";
    case "in_chair":
      return "Enjoy your visit";
    default:
      return arrivalStateLabel(state);
  }
}

export function arrivalHospitalitySubline(
  state: AppointmentArrivalState,
  mode: "customer" | "staff",
  barberName?: string | null,
): string {
  const firstName = barberName?.trim().split(/\s+/)[0];
  if (mode === "staff") {
    return arrivalStateDescription(state);
  }
  switch (state) {
    case "expected":
      return firstName
        ? `When you reach the studio, tap below or scan the QR — ${firstName} will see you on the board.`
        : "When you reach the studio, tap below or scan the QR to let us know you are here.";
    case "arrived":
      return firstName
        ? `${firstName} has been notified. Find a comfortable spot nearby — we will call you when the chair is ready.`
        : "Your barber has been notified. Find a comfortable spot nearby.";
    case "waiting":
      return "You are on today's list. This page updates quietly — no need to refresh.";
    case "in_chair":
      return firstName
        ? `You are with ${firstName} now. Settle in — we will take care of the rest.`
        : "You are in the chair. Settle in — we will take care of the rest.";
    default:
      return arrivalStateDescription(state);
  }
}
