"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type ListSkeletonProps = {
  className?: string;
  /** Announced to assistive tech via `aria-label` on the busy region. */
  statusLabel?: string;
};

export function AppointmentListSkeleton({
  rows = 3,
  className,
  statusLabel = "Loading appointments",
}: ListSkeletonProps & { rows?: number }) {
  return (
    <ul
      className={cn("flex flex-col gap-4", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      {Array.from({ length: rows }, (_, key) => (
        <li key={key}>
          <div className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-5 ring-1 ring-border/40">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-full max-w-sm" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CatalogCardGridSkeleton({
  count = 4,
  className,
  statusLabel = "Loading",
}: ListSkeletonProps & { count?: number }) {
  return (
    <ul
      className={cn("grid list-none gap-4 sm:grid-cols-2", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="flex h-full flex-col gap-3 rounded-xl border border-border/50 bg-card/45 p-5 ring-1 ring-border/45">
            <Skeleton className="h-6 w-2/3 max-w-[14rem]" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="mt-auto h-10 w-full rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotificationListSkeleton({
  rows = 5,
  className,
  statusLabel = "Loading notifications",
}: ListSkeletonProps & { rows?: number }) {
  return (
    <ul
      className={cn("flex flex-col gap-3", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <div className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4 ring-1 ring-border/40">
            <Skeleton className="h-4 w-48 max-w-[85%]" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Shimmers the service, barber, and date fields on the booking form. */
export function BookCatalogFormSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      aria-busy="true"
      aria-label="Loading booking options"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function TimeSlotChipsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      aria-busy="true"
      aria-label="Loading available times"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-[4.5rem] rounded-md sm:h-9" />
      ))}
    </div>
  );
}
