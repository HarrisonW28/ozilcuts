const STORAGE_KEY = "ozilcuts_booking_remembered_v1";

export type RememberedBookingChoice = {
  serviceId: number;
  barberId: number;
  /** Last booked day (YYYY-MM-DD) — pre-selects date on return visits. */
  dateYmd?: string;
};

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function isValidYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Last successful customer booking picks — used to pre-fill /book when no URL prefill.
 */
export function readRememberedBooking(): RememberedBookingChoice | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as RememberedBookingChoice).serviceId !== "number" ||
      typeof (parsed as RememberedBookingChoice).barberId !== "number"
    ) {
      return null;
    }
    const { serviceId, barberId, dateYmd } = parsed as RememberedBookingChoice;
    if (
      !Number.isFinite(serviceId) ||
      !Number.isFinite(barberId) ||
      serviceId < 1 ||
      barberId < 1
    ) {
      return null;
    }
    return {
      serviceId,
      barberId,
      ...(isValidYmd(dateYmd) ? { dateYmd } : {}),
    };
  } catch {
    return null;
  }
}

export function writeRememberedBooking(choice: RememberedBookingChoice): void {
  if (!isBrowser()) return;
  try {
    const payload: RememberedBookingChoice = {
      serviceId: choice.serviceId,
      barberId: choice.barberId,
      ...(isValidYmd(choice.dateYmd) ? { dateYmd: choice.dateYmd } : {}),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
