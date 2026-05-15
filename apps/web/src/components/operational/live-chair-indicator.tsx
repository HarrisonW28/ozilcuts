"use client";

import { cn } from "@ozilcuts/ui";
import { Armchair } from "lucide-react";

type LiveChairIndicatorProps = {
  inUse: boolean;
  guestName?: string | null;
  serviceName?: string | null;
  className?: string;
  compact?: boolean;
};

/**
 * Glanceable chair state — active visit or open chair.
 */
export function LiveChairIndicator({
  inUse,
  guestName,
  serviceName,
  className,
  compact,
}: LiveChairIndicatorProps) {
  return (
    <div
      className={cn(
        "operational-chair-indicator",
        inUse
          ? "operational-chair-indicator--active"
          : "operational-chair-indicator--open",
        className,
      )}
      role="status"
      aria-label={
        inUse
          ? `Chair in use${guestName ? ` — ${guestName}` : ""}`
          : "Chair open"
      }
    >
      {inUse ? (
        <span className="operational-chair-pulse" aria-hidden />
      ) : (
        <Armchair className="size-3.5 shrink-0 opacity-70" aria-hidden />
      )}
      <span className="min-w-0 truncate">
        {inUse
          ? compact
            ? guestName?.split(" ")[0] ?? "In chair"
            : guestName ?? "Guest in chair"
          : "Chair open"}
      </span>
      {inUse && serviceName && !compact ? (
        <span className="hidden text-muted-foreground sm:inline">
          · {serviceName}
        </span>
      ) : null}
    </div>
  );
}
