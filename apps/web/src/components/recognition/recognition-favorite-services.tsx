"use client";

import type { CustomerFavoriteServiceRow } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type RecognitionFavoriteServicesProps = {
  rows: CustomerFavoriteServiceRow[];
  currentServiceId?: number | null;
  compact?: boolean;
  className?: string;
};

export function RecognitionFavoriteServices({
  rows,
  currentServiceId,
  compact = false,
  className,
}: RecognitionFavoriteServicesProps) {
  if (rows.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        Favourite services
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Favourite services">
        {rows.map((row) => {
          const isToday =
            currentServiceId != null && row.service_id === currentServiceId;
          return (
            <li key={row.service_id}>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border font-medium",
                  compact
                    ? "min-h-8 px-2 py-0.5 text-xs"
                    : "px-2.5 py-1 text-sm",
                  isToday
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-muted/20 text-foreground",
                )}
              >
                {row.service_name}
                <span className="ml-1.5 tabular-nums text-caption text-muted-foreground">
                  ×{row.count}
                </span>
                {isToday ? (
                  <span className="ml-1.5 text-micro uppercase tracking-wide text-primary">
                    today
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
