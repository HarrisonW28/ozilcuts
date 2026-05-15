"use client";

import {
  queueProgressCaption,
  queueProgressPercent,
} from "@/lib/queue-intelligence";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type QueueWaitProgressProps = {
  data: AppointmentQueueIntelligenceResponse;
  mode: "customer" | "staff";
  className?: string;
};

export function QueueWaitProgress({
  data,
  mode,
  className,
}: QueueWaitProgressProps) {
  const progressPct = queueProgressPercent(data);

  return (
    <div
      className={cn("queue-wait-progress space-y-1.5", className)}
      aria-label="Approximate progress in today’s visit order"
    >
      <div className="queue-wait-progress-track">
        {progressPct !== null ? (
          <div
            className="queue-wait-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        ) : (
          <div className="queue-wait-progress-indeterminate" />
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        {queueProgressCaption(progressPct, mode)}
      </p>
    </div>
  );
}
