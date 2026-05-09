"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import type { PanInfo } from "framer-motion";
import { ozilcutsSwipeRevealSpring } from "@/lib/motion";
import { cn } from "@ozilcuts/ui";
import { useCallback, useId, useMemo } from "react";

import type { ReactNode } from "react";

export type SwipeRevealActionsProps = {
  children: ReactNode;
  /** Revealed underlay (e.g. vertical action buttons). */
  actions: ReactNode;
  /** Horizontal distance in px when fully open (match underlay width). */
  actionsWidth: number;
  className?: string;
  /** When false, renders children only (no drag). */
  enabled?: boolean;
};

/**
 * iOS-style swipe-left to reveal actions. Footer / visible controls should
 * remain available for keyboard and assistive tech.
 */
export function SwipeRevealActions({
  children,
  actions,
  actionsWidth,
  className,
  enabled = true,
}: SwipeRevealActionsProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const hintId = useId();

  const active = enabled && !reduceMotion && actionsWidth > 0;

  const dragConstraints = useMemo(
    () => ({ left: -actionsWidth, right: 0 }),
    [actionsWidth],
  );

  const onDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!active) return;
      const cx = x.get();
      const threshold = actionsWidth * 0.3;
      const vx = info.velocity.x;
      if (cx < -threshold || vx < -220) {
        animate(x, -actionsWidth, ozilcutsSwipeRevealSpring);
      } else {
        animate(x, 0, ozilcutsSwipeRevealSpring);
      }
    },
    [actionsWidth, active, x],
  );

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl shadow-sm ring-1 ring-border/55",
        className,
      )}
    >
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 z-0 flex flex-col border-l border-border/50 bg-muted/90 backdrop-blur-[2px] dark:bg-muted/70"
        style={{ width: actionsWidth }}
      >
        {actions}
      </div>
      <motion.div
        className="relative z-10 bg-card"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={dragConstraints}
        dragElastic={{ left: 0.06, right: 0 }}
        dragPropagation={false}
        onDragEnd={onDragEnd}
        aria-describedby={hintId}
      >
        <span id={hintId} className="sr-only">
          Swipe left to open quick actions. All actions are also available as
          buttons below.
        </span>
        {children}
      </motion.div>
    </div>
  );
}
