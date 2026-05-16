"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  cn,
} from "@ozilcuts/ui";

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

/** Customer quick-rebook card while cadence + profile load. */
export function BookQuickRepeatCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card
      aria-busy="true"
      aria-label="Loading quick rebook suggestions"
      className={cn(
        "border-primary/25 bg-primary/[0.03] shadow-sm dark:border-primary/20 dark:bg-primary/[0.05]",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36 max-w-full rounded-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-md rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="dashboard-surface motion-card rounded-xl border border-border/40 p-3">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="mt-3 h-3 w-full rounded-md" />
          <Skeleton className="mt-2 h-3 max-w-sm rounded-md" />
          <Skeleton className="mt-4 h-10 w-36 rounded-md" />
        </div>
        <p className="text-xs text-muted-foreground" role="status">
          Looking for your usual cut…
        </p>
      </CardContent>
    </Card>
  );
}

/** Appointment confirmation hero while the booking record loads. */
export function BookingConfirmationCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/50 bg-card/45 p-6 ring-1 ring-border/45",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading booking"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-7 w-48 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/** Shimmers the service, barber, and date fields on the booking form. */
export function BookCatalogFormSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      aria-busy="true"
      aria-label="Loading booking options"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

/** Profile / settings form while customer or barber profile loads. */
export function ProfileFormCardSkeleton({
  className,
  statusLabel = "Loading profile",
}: ListSkeletonProps) {
  return (
    <Card
      className={className}
      aria-busy="true"
      aria-label={statusLabel}
    >
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-11 w-28 rounded-lg" />
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Generic native-shell segment placeholder while Next.js swaps route modules. */
export function AppShellSegmentLoading({
  className,
  statusLabel = "Loading page",
}: ListSkeletonProps) {
  return (
    <main
      id="main-content"
      className={cn("page-main app-shell-scroll flex-1", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      <div className="page-stack mx-auto w-full max-w-lg sm:max-w-2xl lg:max-w-3xl">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-9 w-52 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-full max-w-md rounded-md" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl sm:h-52" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl sm:h-36" />
          <Skeleton className="h-32 rounded-xl sm:h-36" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </main>
  );
}

/** Customer `/home` shell while session resolves or redirects. */
export function CustomerHomeSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg space-y-9 sm:max-w-2xl md:space-y-10 lg:max-w-3xl",
        className,
      )}
      aria-busy="true"
      aria-label="Loading home"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-9 w-48 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-44 w-[8.5rem] shrink-0 rounded-2xl" />
        <Skeleton className="h-36 w-[7.25rem] shrink-0 rounded-xl" />
        <Skeleton className="h-36 w-[7.25rem] shrink-0 rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}


/** Check-in flow hero while appointment loads. */
export function CheckInPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-lg page-stack", className)}
      aria-busy="true"
      aria-label="Loading check-in"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function TimeSlotChipsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 sm:grid-cols-4",
        className,
      )}
      aria-busy="true"
      aria-label="Loading available times"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-xl sm:h-11" />
      ))}
    </div>
  );
}
