import type { BarberSmartSlotHintsPayload } from "@ozilcuts/types";

export type SmartSlotHintsLoadStatus = "idle" | "loading" | "ok" | "error";

export function smartSlotHintsHasContent(
  hints: BarberSmartSlotHintsPayload | null,
): boolean {
  if (!hints) return false;
  return Boolean(
    hints.affinity ||
      hints.repeat_booking ||
      hints.preferred_time_windows.length > 0 ||
      hints.cancellation_match.hint,
  );
}
