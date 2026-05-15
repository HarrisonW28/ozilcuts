"use client";

import { GEOFENCE_RADIUS_METRES } from "@/lib/geofence-arrival";
import { cn } from "@ozilcuts/ui";
import { Shield } from "lucide-react";
import Link from "next/link";

type GeofencePrivacyOptInProps = {
  arrivalLocationOptIn: boolean | null;
  locationDenied?: boolean;
  loading?: boolean;
  className?: string;
};

export function GeofencePrivacyOptIn({
  arrivalLocationOptIn,
  locationDenied = false,
  loading = false,
  className,
}: GeofencePrivacyOptInProps) {
  return (
    <div className={cn("geofence-privacy-card space-y-2", className)}>
      <div className="flex items-start gap-2">
        <Shield
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Privacy-first arrival assist
          </p>
          {loading || arrivalLocationOptIn === null ? (
            <p className="text-caption text-muted-foreground">
              Checking your preferences…
            </p>
          ) : null}
          {arrivalLocationOptIn === false ? (
            <p className="text-caption leading-relaxed text-muted-foreground">
              Location sharing is off. Enable{" "}
              <span className="font-medium text-foreground">
                arrival location sharing
              </span>{" "}
              in{" "}
              <Link
                href="/profile"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                your profile
              </Link>{" "}
              for optional nearby alerts and automatic check-in. We never store
              your GPS on the booking — only coarse, infrequent pings inside
              your visit window.
            </p>
          ) : null}
          {arrivalLocationOptIn === true ? (
            <p className="text-caption leading-relaxed text-muted-foreground">
              While this page is open, we may request your location about every
              three minutes (low accuracy, not continuous tracking). Inside a
              ~{GEOFENCE_RADIUS_METRES} m studio zone we send one calm heads-up
              to you and your barber, then stop. Turn off anytime in your
              profile.
            </p>
          ) : null}
          {locationDenied && arrivalLocationOptIn === true ? (
            <p className="text-caption text-amber-800 dark:text-amber-200" role="status">
              Location access is blocked in your browser — use manual check-in
              below or allow location for this site.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
