"use client";

import { formatCalmWaitEstimate } from "@/lib/shop-live-status";
import { cn } from "@ozilcuts/ui";
import { Clock, Users } from "lucide-react";

type QueueVisibilityStripProps = {
  estimatedMinutesAhead: number | null;
  guestsAheadInArrival: number;
  loungeGuestsOther?: number;
  visitsBehindSchedule?: number;
  className?: string;
};

/**
 * Compact queue metrics — wait estimate, line position, day rhythm.
 */
export function QueueVisibilityStrip({
  estimatedMinutesAhead,
  guestsAheadInArrival,
  loungeGuestsOther = 0,
  visitsBehindSchedule = 0,
  className,
}: QueueVisibilityStripProps) {
  const waitLabel = formatCalmWaitEstimate(estimatedMinutesAhead);

  return (
    <div
      className={cn("operational-queue-strip", className)}
      role="group"
      aria-label="Queue visibility"
    >
      <div className="operational-queue-metric">
        <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
          Wait hint
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {waitLabel ?? "Flexible today"}
        </p>
      </div>
      <div className="operational-queue-metric">
        <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
          In line
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {guestsAheadInArrival === 0
            ? "You are next up"
            : guestsAheadInArrival === 1
              ? "1 ahead"
              : `${guestsAheadInArrival} ahead`}
        </p>
      </div>
      {loungeGuestsOther > 0 ? (
        <div className="operational-queue-metric">
          <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
            Lounge
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {loungeGuestsOther === 1
              ? "1 nearby"
              : `${loungeGuestsOther} nearby`}
          </p>
        </div>
      ) : null}
      <div className="operational-queue-metric">
        <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
          Flow
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {visitsBehindSchedule > 0 ? "Easing pace" : "On track"}
        </p>
      </div>
    </div>
  );
}
