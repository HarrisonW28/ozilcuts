"use client";

import { queuePositionDotCount } from "@/lib/queue-intelligence";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type QueuePositionRailProps = {
  data: AppointmentQueueIntelligenceResponse;
  className?: string;
};

/**
 * Calm dot rail — position in today’s visit order, not a ticking clock.
 */
export function QueuePositionRail({ data, className }: QueuePositionRailProps) {
  const dotCount = queuePositionDotCount(
    data.guests_ahead_in_arrival,
    data.is_next_in_line,
  );
  const youIndex = data.is_next_in_line ? dotCount - 1 : dotCount - 1;

  return (
    <div
      className={cn("queue-position-rail", className)}
      role="img"
      aria-label={
        data.is_next_in_line
          ? "You are next in line for the chair"
          : data.guests_ahead_in_arrival === 1
            ? "One visit ahead of you in line"
            : `${data.guests_ahead_in_arrival} visits ahead of you in line`
      }
    >
      {Array.from({ length: dotCount }, (_, i) => {
        const isYou = i === youIndex;
        const isAhead = i < youIndex;
        return (
          <span
            key={i}
            className={cn(
              "queue-position-dot",
              isYou && "queue-position-dot--you",
              isAhead && "queue-position-dot--ahead",
            )}
          />
        );
      })}
    </div>
  );
}
