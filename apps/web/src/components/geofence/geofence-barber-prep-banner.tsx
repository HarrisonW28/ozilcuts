"use client";

import { guestNearbyPrepMessage } from "@/lib/geofence-arrival";
import type { AppointmentRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Scissors } from "lucide-react";

type GeofenceBarberPrepBannerProps = {
  appointment: AppointmentRecord;
  className?: string;
};

/** Staff-facing heads-up when geofence already pinged barber prep. */
export function GeofenceBarberPrepBanner({
  appointment,
  className,
}: GeofenceBarberPrepBannerProps) {
  const message = guestNearbyPrepMessage(appointment);
  if (!message) return null;

  return (
    <div
      className={cn("geofence-prep-banner flex gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-900 dark:text-amber-100">
        <Scissors className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-micro font-semibold uppercase tracking-wide text-amber-900/85 dark:text-amber-100/90">
          Guest nearby
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">
          {message}
        </p>
        <p className="text-caption text-muted-foreground">
          Triggered by optional location sharing — no live tracking on your
          board.
        </p>
      </div>
    </div>
  );
}
