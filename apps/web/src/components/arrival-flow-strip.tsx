"use client";

import { arrivalStateLabel } from "@/lib/appointment-arrival";
import type { AppointmentArrivalState } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

const FLOW: AppointmentArrivalState[] = [
  "expected",
  "arrived",
  "waiting",
  "in_chair",
];

const STEP_SHORT: Record<AppointmentArrivalState, string> = {
  expected: "Due",
  arrived: "Here",
  waiting: "Wait",
  in_chair: "Chair",
};

type ArrivalFlowStripProps = {
  state: AppointmentArrivalState;
  className?: string;
  /** Tighter labels on dense rows. */
  compact?: boolean;
};

/**
 * Glanceable visit pipeline for barber operational surfaces (not a control).
 */
export function ArrivalFlowStrip({ state, className, compact }: ArrivalFlowStripProps) {
  const active = FLOW.indexOf(state);
  const safeActive = active >= 0 ? active : 0;

  return (
    <div
      className={cn("w-full", className)}
      role="group"
      aria-label={`Visit flow: ${arrivalStateLabel(state)}`}
    >
      <ol className="flex list-none items-center gap-0.5 sm:gap-1">
        {FLOW.map((step, idx) => {
          const done = idx < safeActive;
          const current = idx === safeActive;
          const label = compact ? STEP_SHORT[step] : arrivalStateLabel(step);

          return (
            <li key={step} className="flex min-w-0 flex-1 items-center">
              {idx > 0 ? (
                <span
                  className={cn(
                    "mx-0.5 h-px w-2 shrink-0 sm:mx-1 sm:w-3",
                    done || current ? "bg-primary/45" : "bg-border/60",
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-center sm:px-1.5 sm:py-2",
                  current
                    ? "border-primary/50 bg-primary/10 text-foreground shadow-sm"
                    : done
                      ? "border-border/40 bg-muted/25 text-foreground/90"
                      : "border-border/35 bg-background/40 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "block max-w-full truncate text-[10px] font-semibold uppercase leading-none tracking-wide sm:text-micro",
                    current && "text-primary",
                  )}
                >
                  {label}
                </span>
                <span className="sr-only">
                  {current ? "Current step" : done ? "Completed" : "Upcoming"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
