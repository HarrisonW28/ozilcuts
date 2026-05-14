"use client";

import { Skeleton } from "@ozilcuts/ui";

/** Inline placeholder while walk-in service list loads. */
export function LiveDayServiceSelectSkeleton() {
  return (
    <div
      className="flex min-h-12 w-full items-center rounded-lg border border-border/50 bg-muted/15 px-3 py-2 dark:bg-muted/10"
      aria-hidden
    >
      <Skeleton className="h-4 w-[min(100%,14rem)] max-w-full rounded-md" />
    </div>
  );
}

/** Shimmer rows under the slot label while open times load. */
export function LiveDaySlotListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-12 w-full rounded-lg sm:h-11" />
        </li>
      ))}
    </ul>
  );
}
