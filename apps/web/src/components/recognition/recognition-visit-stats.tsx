"use client";

import type { CustomerVisitSummary } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type RecognitionVisitStatsProps = {
  summary: CustomerVisitSummary;
  visitsWithThisBarber: number;
  compact?: boolean;
  className?: string;
};

export function RecognitionVisitStats({
  summary,
  visitsWithThisBarber,
  compact = false,
  className,
}: RecognitionVisitStatsProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-2" : "gap-3 sm:grid-cols-2",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-background/60 dark:bg-background/40",
          compact ? "px-3 py-2.5" : "px-3 py-3",
        )}
      >
        <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Salon visits
        </p>
        <p
          className={cn(
            "mt-0.5 font-semibold tabular-nums text-foreground",
            compact ? "text-xl" : "mt-1 text-2xl",
          )}
        >
          {summary.total_visits}
        </p>
        {!compact ? (
          <p className="text-caption text-muted-foreground">
            Confirmed cuts (lifetime)
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-background/60 dark:bg-background/40",
          compact ? "px-3 py-2.5" : "px-3 py-3",
        )}
      >
        <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          With you
        </p>
        <p
          className={cn(
            "mt-0.5 font-semibold tabular-nums text-foreground",
            compact ? "text-xl" : "mt-1 text-2xl",
          )}
        >
          {visitsWithThisBarber}
        </p>
        {!compact ? (
          <p className="text-caption text-muted-foreground">
            Confirmed bookings in your chair
          </p>
        ) : null}
      </div>
    </div>
  );
}
