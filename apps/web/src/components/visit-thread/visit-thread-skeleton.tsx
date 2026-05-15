"use client";

import { Skeleton } from "@ozilcuts/ui";

type VisitThreadSkeletonProps = {
  className?: string;
};

export function VisitThreadSkeleton({ className }: VisitThreadSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading booking thread"
    >
      <span className="sr-only">Loading visit thread…</span>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
