"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type CustomerSummarySkeletonCompactProps = {
  className?: string;
};

export function CustomerSummarySkeletonCompact({
  className,
}: CustomerSummarySkeletonCompactProps) {
  return (
    <div
      className={cn("customer-summary-skeleton-compact space-y-3", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading customer summary…</span>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-36 rounded-md sm:w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="ms-auto h-10 w-28 rounded-md sm:h-9" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-3 w-4/5 max-w-md rounded-md" />
    </div>
  );
}

type CustomerSummarySkeletonExpandedProps = {
  className?: string;
};

export function CustomerSummarySkeletonExpanded({
  className,
}: CustomerSummarySkeletonExpandedProps) {
  return (
    <div
      className={cn(
        "customer-summary-skeleton-expanded rounded-2xl border border-violet-500/15 bg-violet-500/[0.02] p-4 dark:border-violet-400/12 dark:bg-violet-500/[0.04]",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading customer summary…</span>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-xl border border-border/30 bg-background/40 p-3.5 dark:bg-background/30"
          >
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-10 w-full max-w-md rounded-lg" />
    </div>
  );
}
