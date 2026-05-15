"use client";

import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";
import { LoadingRegion } from "./loading-region";

export type AsyncPhase = "loading" | "error" | "empty" | "ready";

type AsyncContentProps = {
  phase: AsyncPhase;
  skeleton: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  statusLabel?: string;
  className?: string;
  contentClassName?: string;
  minHeight?: string;
  /**
   * When true, keep showing `children` at reduced opacity instead of swapping
   * to the full skeleton (filter changes, pagination, soft refresh).
   */
  isRefreshing?: boolean;
};

/**
 * Crossfades between skeleton, error, empty, and loaded content with consistent
 * motion + accessibility across customer, barber, and admin surfaces.
 */
export function AsyncContent({
  phase,
  skeleton,
  children,
  error,
  empty,
  statusLabel = "Loading",
  className,
  contentClassName,
  minHeight,
  isRefreshing = false,
}: AsyncContentProps) {
  const initialLoad = phase === "loading" && !isRefreshing;
  const showError = phase === "error" && !isRefreshing;
  const showEmpty = phase === "empty" && !isRefreshing;
  const showContent = phase === "ready" || isRefreshing;

  return (
    <LoadingRegion
      busy={initialLoad || isRefreshing}
      statusLabel={statusLabel}
      className={className}
      minHeight={minHeight}
    >
      {initialLoad ? <div className="motion-content-in">{skeleton}</div> : null}

      {showError && error ? (
        <div className="motion-content-in" role="alert">
          {error}
        </div>
      ) : null}

      {showEmpty && empty ? (
        <div className="motion-content-in">{empty}</div>
      ) : null}

      {showContent ? (
        <div
          className={cn(
            "motion-content-in relative",
            isRefreshing && "optimistic-pending",
            contentClassName,
          )}
          aria-busy={isRefreshing || undefined}
        >
          {children}
          {isRefreshing ? (
            <div
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-background/40 backdrop-blur-[1px] motion-safe:animate-pulse dark:bg-background/50"
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}
    </LoadingRegion>
  );
}
