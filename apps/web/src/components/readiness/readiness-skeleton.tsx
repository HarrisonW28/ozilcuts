"use client";

import { Card, CardContent, CardHeader, Skeleton, cn } from "@ozilcuts/ui";

type ReadinessSkeletonProps = {
  className?: string;
};

export function ReadinessSkeleton({ className }: ReadinessSkeletonProps) {
  return (
    <Card
      className={cn(
        "readiness-panel border-border/50 shadow-none dark:border-border/40",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading barber prep context…</span>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-56 rounded-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-md rounded-md" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="readiness-scan-grid">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
