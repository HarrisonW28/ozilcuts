import * as React from "react";

import { cn } from "../lib/utils";
import { Skeleton } from "./skeleton";

export type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

/**
 * Loading placeholder shaped like a small table. One outer
 * `role="status"` makes the whole block an SR-friendly "loading"
 * region so the inner shimmer rows can stay decorative.
 */
function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div
      data-slot="table-skeleton"
      role="status"
      aria-label="Loading"
      className={cn("flex flex-col gap-3", className)}
    >
      <span className="sr-only">Loading…</span>
      <div className="flex gap-3" aria-hidden>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3" aria-hidden>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { TableSkeleton };
