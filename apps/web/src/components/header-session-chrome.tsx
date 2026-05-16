"use client";

import { Skeleton } from "@ozilcuts/ui";

/** Matches notifications bell + account menu footprint in SiteHeader. */
export function HeaderAccountSkeleton() {
  return (
    <div
      className="flex items-center gap-2"
      aria-busy="true"
      aria-label="Loading account"
    >
      <Skeleton className="size-10 shrink-0 rounded-lg md:size-9" />
      <Skeleton className="h-10 w-[5.5rem] rounded-lg sm:w-32 md:h-9" />
    </div>
  );
}

/** Placeholder for role-specific primary nav links (Home, Appointments, etc.). */
export function HeaderPrimaryNavSkeleton() {
  return (
    <>
      <Skeleton
        className="hidden h-9 w-[4.5rem] rounded-md md:inline-flex"
        aria-hidden
      />
      <Skeleton
        className="hidden h-9 w-[6.75rem] rounded-md md:inline-flex"
        aria-hidden
      />
    </>
  );
}

/** Compact account slot for app-shell header. */
export function AppShellHeaderAccountSkeleton() {
  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2"
      aria-busy="true"
      aria-label="Loading account"
    >
      <Skeleton className="size-9 rounded-lg" />
      <Skeleton className="h-9 w-20 rounded-lg sm:w-24" />
    </div>
  );
}
