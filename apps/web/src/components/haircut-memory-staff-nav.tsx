"use client";

import { cn } from "@ozilcuts/ui";

export type HaircutMemoryStaffNavProps = {
  showBookingNotes: boolean;
  className?: string;
};

/**
 * In-page anchors for barber operational context on the confirmation page.
 */
export function HaircutMemoryStaffNav({
  showBookingNotes,
  className,
}: HaircutMemoryStaffNavProps) {
  const chip = cn(
    "motion-interactive inline-flex min-h-11 items-center justify-center rounded-full border border-border/60 bg-card/80 px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors",
    "hover:border-primary/35 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10",
  );

  return (
    <nav
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Jump to haircut memory sections"
    >
      {showBookingNotes ? (
        <a href="#memory-booking-notes" className={chip}>
          Booking note
        </a>
      ) : null}
      <a href="#memory-hair-profile" className={chip}>
        Hair profile
      </a>
      <a href="#memory-visit-photos" className={chip}>
        Visit photos
      </a>
      <a href="#memory-staff-notes" className={chip}>
        Notes &amp; tags
      </a>
    </nav>
  );
}
