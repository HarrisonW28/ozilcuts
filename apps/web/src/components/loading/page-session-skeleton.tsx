"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type PageSessionSkeletonProps = {
  className?: string;
  statusLabel?: string;
};

/** Screen title + hub grid while session/profile resolves on dashboard pages. */
export function PageSessionSkeleton({
  className,
  statusLabel = "Loading",
}: PageSessionSkeletonProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl page-stack", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-9 w-56 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl sm:h-40" />
        ))}
      </div>
    </div>
  );
}
