"use client";

import type { FloorPresenceCounts } from "@/lib/operational-presence";
import { cn } from "@ozilcuts/ui";
import { Armchair, Clock, UserCheck, Users } from "lucide-react";

type PresenceFloorStripProps = {
  counts: FloorPresenceCounts;
  className?: string;
};

export function PresenceFloorStrip({ counts, className }: PresenceFloorStripProps) {
  const onFloor = counts.checkedIn + counts.waiting + counts.inChair;
  if (onFloor === 0 && counts.expected === 0) return null;

  return (
    <div
      className={cn("presence-floor-strip", className)}
      role="list"
      aria-label="Today’s floor presence"
    >
      {counts.checkedIn > 0 ? (
        <span className="presence-floor-chip presence-floor-chip--active" role="listitem">
          <UserCheck className="size-3.5 shrink-0" aria-hidden />
          {counts.checkedIn} checked in
        </span>
      ) : null}
      {counts.waiting > 0 ? (
        <span className="presence-floor-chip presence-floor-chip--active" role="listitem">
          <Users className="size-3.5 shrink-0" aria-hidden />
          {counts.waiting} waiting
        </span>
      ) : null}
      {counts.inChair > 0 ? (
        <span className="presence-floor-chip presence-floor-chip--active" role="listitem">
          <Armchair className="size-3.5 shrink-0" aria-hidden />
          {counts.inChair} in chair
        </span>
      ) : null}
      {counts.expected > 0 ? (
        <span className="presence-floor-chip presence-floor-chip--muted" role="listitem">
          <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
          {counts.expected} expected
        </span>
      ) : null}
    </div>
  );
}
