"use client";

import type { BarberProfilePublic, ServiceSummary } from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type BookingSelectionChipsProps = {
  service: ServiceSummary;
  barber: BarberProfilePublic;
  date: string;
  onChangeService: () => void;
  onChangeBarber: () => void;
  className?: string;
};

/** Compact summary of locked-in service + barber in express booking flow. */
export function BookingSelectionChips({
  service,
  barber,
  date,
  onChangeService,
  onChangeBarber,
  className,
}: BookingSelectionChipsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/15 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
        className,
      )}
      role="status"
      aria-label="Your selections"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your cut
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="rounded-lg bg-background px-2.5 py-1 text-sm font-medium shadow-xs ring-1 ring-border/50">
          {service.name}
        </span>
        <span className="rounded-lg bg-background px-2.5 py-1 text-sm font-medium shadow-xs ring-1 ring-border/50">
          {barber.barber.name}
        </span>
        <span className="rounded-lg bg-background px-2.5 py-1 text-sm tabular-nums text-muted-foreground shadow-xs ring-1 ring-border/50">
          {formatIsoDate(date)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 touch-manipulation px-2.5"
          onClick={onChangeService}
        >
          Change service
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 touch-manipulation px-2.5"
          onClick={onChangeBarber}
        >
          Change barber
        </Button>
      </div>
    </div>
  );
}
