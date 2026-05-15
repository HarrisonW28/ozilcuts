"use client";

import { formatEtaMinutes } from "@/lib/geofence-arrival";
import { MapPin } from "lucide-react";
import { cn } from "@ozilcuts/ui";

type GeofenceEtaChipProps = {
  minutes: number | null | undefined;
  className?: string;
};

export function GeofenceEtaChip({ minutes, className }: GeofenceEtaChipProps) {
  const label = formatEtaMinutes(minutes);
  if (!label) return null;

  return (
    <span className={cn("geofence-eta-chip", className)}>
      <MapPin className="size-3 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  );
}
