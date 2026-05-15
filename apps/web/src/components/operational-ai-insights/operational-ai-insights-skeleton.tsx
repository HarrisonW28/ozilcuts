"use client";

import { Card, CardContent, CardHeader, Skeleton } from "@ozilcuts/ui";

type OperationalAiInsightsSkeletonProps = {
  className?: string;
};

export function OperationalAiInsightsSkeleton({
  className,
}: OperationalAiInsightsSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label="Loading AI operational insights"
      className={className}
    >
      <span className="sr-only">Loading operational intelligence…</span>
      <Skeleton className="mb-4 h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm" className="dashboard-surface border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <div className="flex gap-3">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-4/5 max-w-[14rem]" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
