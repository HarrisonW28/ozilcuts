"use client";

import type { BarberSmartSlotAffinity } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type SmartSlotHintsAffinityProps = {
  affinity: BarberSmartSlotAffinity;
  className?: string;
};

export function SmartSlotHintsAffinity({
  affinity,
  className,
}: SmartSlotHintsAffinityProps) {
  const { score, label, visits_pair, visits_with_barber } = affinity;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Your booking fit
        </p>
        <p className="text-caption tabular-nums text-muted-foreground">
          {visits_pair} with this service · {visits_with_barber} with this barber
        </p>
      </div>
      <div
        className="mt-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`Booking affinity score ${score} out of 100`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {score}
            <span className="text-base font-medium text-muted-foreground">
              /100
            </span>
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted/80 dark:bg-muted/50"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-primary dark:from-violet-400 dark:to-primary"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{label}</p>
    </div>
  );
}
