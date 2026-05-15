"use client";

import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type LoadingRegionProps = {
  children: ReactNode;
  /** When true, exposes `aria-busy` for assistive tech. */
  busy?: boolean;
  /** Announced while busy (paired with `aria-busy`). */
  statusLabel?: string;
  className?: string;
  /** Reduces layout shift while skeletons display. */
  minHeight?: string;
};

/**
 * Accessible busy region wrapper — use around skeletons or async content blocks.
 */
export function LoadingRegion({
  children,
  busy = false,
  statusLabel = "Loading",
  className,
  minHeight,
}: LoadingRegionProps) {
  return (
    <div
      className={cn("relative", className)}
      style={minHeight ? { minHeight } : undefined}
      aria-busy={busy || undefined}
      aria-live={busy ? "polite" : undefined}
      aria-label={busy ? statusLabel : undefined}
    >
      {children}
    </div>
  );
}
