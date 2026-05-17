"use client";

import {
  buildWeeklyHoursRows,
  type WeeklyHoursRow,
} from "@/lib/weekly-hours-display";
import type { BarberAvailabilityDay } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { useMemo } from "react";

type WeeklyHoursDisplayProps = {
  className?: string;
  /** Pre-built rows (e.g. static marketing copy). */
  rows?: WeeklyHoursRow[];
  /** Barber / shop availability payload. */
  weekdays?: BarberAvailabilityDay[];
};

export function WeeklyHoursDisplay({
  className,
  rows: rowsProp,
  weekdays,
}: WeeklyHoursDisplayProps) {
  const rows = useMemo(() => {
    if (rowsProp?.length) return rowsProp;
    if (weekdays?.length) return buildWeeklyHoursRows(weekdays);
    return [];
  }, [rowsProp, weekdays]);

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card/65 shadow-xs dark:bg-card/40",
        className,
      )}
    >
      <ul className="divide-y divide-border/40" aria-label="Hours">
        {rows.map((row) => (
          <li
            key={row.dayLabel}
            className="grid grid-cols-1 gap-0.5 px-4 py-3 sm:grid-cols-[minmax(9rem,42%)_1fr] sm:items-center sm:gap-6 sm:px-5 sm:py-3.5"
          >
            <span className="text-sm font-semibold leading-snug text-foreground">
              {row.dayLabel}
            </span>
            <span
              className={cn(
                "text-sm leading-snug tabular-nums sm:text-right",
                row.isClosed
                  ? "text-muted-foreground/90"
                  : "text-muted-foreground",
              )}
            >
              {row.hoursLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
