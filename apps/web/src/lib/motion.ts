import type { Transition } from "framer-motion";

/**
 * Framer Motion presets aligned with `apps/web/src/app/globals.css` motion tokens
 * (`--motion-duration-*`, `--motion-ease-standard`).
 */

/** Main content fade-up; matches `.motion-enter` (~`--motion-duration-slow`). */
export const ozilcutsPageEnterTransition: Transition = {
  duration: 0.26,
  ease: [0.2, 0, 0, 1],
};

export function ozilcutsPageEnterInitial(
  prefersReducedMotion: boolean | null,
): { opacity: number; y: number } {
  if (prefersReducedMotion === true) {
    return { opacity: 1, y: 0 };
  }
  return { opacity: 0, y: 8 };
}

/** Swipe-open row snap — spring tuned for a quick settle without overshoot. */
export const ozilcutsSwipeRevealSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 44,
  mass: 0.85,
};
