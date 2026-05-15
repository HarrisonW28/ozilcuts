"use client";

import { arrivalStateLabel } from "@/lib/appointment-arrival";
import type { AppointmentArrivalState } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Armchair, CheckCircle2, MapPin, ScanLine, Sofa } from "lucide-react";

const STEP_ORDER: AppointmentArrivalState[] = [
  "expected",
  "arrived",
  "waiting",
  "in_chair",
];

const STEP_ICONS = {
  expected: MapPin,
  arrived: CheckCircle2,
  waiting: Sofa,
  in_chair: Armchair,
} as const;

type CheckInProgressRailProps = {
  state: AppointmentArrivalState;
  className?: string;
};

export function CheckInProgressRail({ state, className }: CheckInProgressRailProps) {
  const activeIdx = STEP_ORDER.indexOf(state);
  const safeActive = activeIdx >= 0 ? activeIdx : 0;

  return (
    <ol
      className={cn("check-in-progress-rail list-none", className)}
      aria-label="Visit progress"
    >
      {STEP_ORDER.map((step, i) => {
        const done = i < safeActive;
        const current = i === safeActive;
        const Icon = STEP_ICONS[step];
        const DisplayIcon = current ? ScanLine : Icon;

        return (
          <li
            key={step}
            className={cn(
              "check-in-progress-step",
              current && "check-in-progress-step--current",
              done && !current && "check-in-progress-step--done",
              !done && !current && "check-in-progress-step--upcoming",
            )}
          >
            <span className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
              {arrivalStateLabel(step)}
            </span>
            <DisplayIcon
              className={cn(
                "mt-2 size-5",
                current || done ? "text-primary" : "text-muted-foreground/50",
                current && "motion-safe:animate-pulse",
              )}
              aria-hidden={!done}
              aria-label={done ? "Complete" : undefined}
            />
            <span className="sr-only">
              {current ? "Current step" : done ? "Completed" : "Upcoming"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
