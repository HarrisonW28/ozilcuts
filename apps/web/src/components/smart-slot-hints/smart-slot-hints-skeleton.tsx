"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type SmartSlotHintsSkeletonProps = {
  className?: string;
};

export function SmartSlotHintsSkeleton({ className }: SmartSlotHintsSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-primary/[0.03] p-4 dark:border-primary/20 dark:bg-primary/[0.05]",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading smart booking suggestions…</span>
      <Skeleton className="h-5 w-48 rounded-md" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border/30 bg-background/50 p-3 dark:bg-background/40">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-2 rounded-xl border border-border/30 bg-background/50 p-3 dark:bg-background/40">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="mt-3 h-12 w-full rounded-lg sm:max-w-md" />
    </div>
  );
}
