"use client";

import { cn } from "@ozilcuts/ui";

type GeofenceProximityBannerProps = {
  message: string;
  className?: string;
};

export function GeofenceProximityBanner({
  message,
  className,
}: GeofenceProximityBannerProps) {
  return (
    <p
      className={cn("geofence-proximity-banner", className)}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
