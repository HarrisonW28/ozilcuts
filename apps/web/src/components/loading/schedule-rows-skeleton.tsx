"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type ScheduleRowsSkeletonProps = {
  rows?: number;
  className?: string;
  statusLabel?: string;
};

/** Barber day schedule rows while appointments load. */
export function ScheduleRowsSkeleton({
  rows = 3,
  className,
  statusLabel = "Loading today's schedule",
}: ScheduleRowsSkeletonProps) {
  return (
    <div
      className={cn("space-y-4", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "w-full rounded-2xl",
            i === 0 ? "h-28" : i === 1 ? "h-28" : "h-24",
          )}
        />
      ))}
    </div>
  );
}
