"use client";

import { waitingLoungeHeadline } from "@/lib/check-in-flow";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";
import { Skeleton, cn } from "@ozilcuts/ui";
import { Clock, Sofa, Users } from "lucide-react";

type CheckInWaitingLoungeProps = {
  queueData?: AppointmentQueueIntelligenceResponse | null;
  queueLoading?: boolean;
  className?: string;
};

export function CheckInWaitingLounge({
  queueData,
  queueLoading = false,
  className,
}: CheckInWaitingLoungeProps) {
  const guestsAhead = queueData?.guests_ahead_in_arrival ?? 0;
  const chairMin = queueData?.estimated_chair_minutes_ahead ?? null;
  const detail =
    queueData && !queueLoading
      ? waitingLoungeHeadline(guestsAhead, chairMin)
      : null;

  return (
    <div className={cn("check-in-lounge-card", className)} role="status" aria-live="polite">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-background/80 shadow-sm dark:bg-background/60">
        <Sofa className="size-7 text-amber-800 dark:text-amber-200" aria-hidden />
      </div>
      <p className="text-lg font-semibold tracking-tight text-foreground">
        You are on the list
      </p>

      {queueLoading && !queueData ? (
        <div className="mx-auto mt-4 max-w-sm space-y-2" aria-busy="true">
          <Skeleton className="mx-auto h-4 w-full max-w-xs rounded-md" />
          <Skeleton className="mx-auto h-3 w-2/3 rounded-md" />
        </div>
      ) : null}

      {detail ? (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {detail}
        </p>
      ) : (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Take a seat in the lounge — we will call your name when the chair is
          ready. This page updates on its own.
        </p>
      )}

      {queueData?.headline ? (
        <p className="mx-auto mt-3 max-w-md text-caption leading-relaxed text-foreground/90">
          {queueData.headline}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="check-in-lounge-pill">
          <span className="size-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden />
          Live updates
        </span>
        {queueData?.is_next_in_line ? (
          <span className="check-in-lounge-pill">Next for the chair</span>
        ) : null}
        {guestsAhead > 0 ? (
          <span className="check-in-lounge-pill">
            <Users className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {guestsAhead} ahead
          </span>
        ) : null}
        {chairMin != null && chairMin > 0 ? (
          <span className="check-in-lounge-pill">
            <Clock className="size-3.5 shrink-0 opacity-80" aria-hidden />
            ~{chairMin} min chair time
          </span>
        ) : null}
      </div>
    </div>
  );
}
