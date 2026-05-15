import type {
  AppointmentArrivalProximityResponse,
  AppointmentRecord,
} from "@ozilcuts/types";

/** Match server `ArrivalProximityService::GEOFENCE_RADIUS_M` (display only). */
export const GEOFENCE_RADIUS_METRES = 220;

/** Low-frequency pings while check-in is visible — battery-conscious. */
export const GEOFENCE_PING_INTERVAL_MS = 180_000;

/** Reuse recent fixes when the OS still has a cached position. */
export const GEOFENCE_POSITION_MAX_AGE_MS = 120_000;

export const GEOFENCE_POSITION_TIMEOUT_MS = 25_000;

/** `getCurrentPosition` options — low accuracy, no continuous watch. */
export const GEOFENCE_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: GEOFENCE_POSITION_MAX_AGE_MS,
  timeout: GEOFENCE_POSITION_TIMEOUT_MS,
};

export function hasShopCoordinates(
  appointment: AppointmentRecord,
): boolean {
  const lat = appointment.barber?.shop_latitude;
  const lng = appointment.barber?.shop_longitude;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  );
}

export function isGeolocationAvailable(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function formatEtaMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes === 1) return "~1 min on foot";
  return `~${minutes} min on foot`;
}

export function formatProximityBanner(
  res: AppointmentArrivalProximityResponse,
): string | null {
  if (!res.within_geofence) return null;

  if (res.customer_notified || res.barber_notified) {
    const eta = formatEtaMinutes(res.approximate_eta_minutes);
    return eta
      ? `You are near the shop — we sent a gentle heads-up. ${eta}.`
      : "You are near the shop — we sent a gentle heads-up.";
  }

  const eta = formatEtaMinutes(res.approximate_eta_minutes);
  if (eta) return `You are within range of the studio. ${eta}.`;

  return "You are within range of the studio.";
}

export function formatAutoCheckInBanner(): string {
  return "You are checked in automatically — head inside when you are ready.";
}

export function guestNearbyPrepMessage(
  appointment: AppointmentRecord,
): string | null {
  if (!appointment.arrival_nearby_barber_notified_at) return null;
  const name = appointment.customer?.name?.trim().split(/\s+/)[0];
  return name
    ? `${name} is nearby — a good moment to prep the chair.`
    : "Your guest is nearby — a good moment to prep the chair.";
}
