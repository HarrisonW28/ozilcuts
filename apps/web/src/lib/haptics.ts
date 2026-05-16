/**
 * Optional Vibration API feedback for touch interactions (Android / some devices).
 * iOS Safari generally does not expose `navigator.vibrate`; calls are no-ops.
 * Respects `prefers-reduced-motion` — skipped when the user asks for less motion.
 */

export type HapticKind = "selection" | "light" | "medium" | "success" | "warning";

function shouldUseHaptics(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  } catch {
    /* ignore */
  }
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/** Subtle tap — tabs, pills, slot chips. */
const PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 16,
  success: [12, 45, 14],
  warning: [14, 60, 14],
};

export function haptic(kind: HapticKind): void {
  if (!shouldUseHaptics()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* Some browsers throw on invalid patterns */
  }
}

/** Fire only for direct touch pointers (not mouse / pen). */
export function hapticTouch(kind: HapticKind, pointerType: string): void {
  if (pointerType !== "touch") return;
  haptic(kind);
}
