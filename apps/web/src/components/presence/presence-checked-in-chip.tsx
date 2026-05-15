"use client";

import { arrivalStateLabel } from "@/lib/appointment-arrival";
import type { AppointmentArrivalState } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type PresenceCheckedInChipProps = {
  state: AppointmentArrivalState;
  className?: string;
};

export function PresenceCheckedInChip({
  state,
  className,
}: PresenceCheckedInChipProps) {
  if (state === "expected") return null;

  const tone =
    state === "in_chair"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
      : state === "waiting"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        : "border-teal-500/35 bg-teal-500/10 text-teal-950 dark:text-teal-100";

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-widecaps",
        tone,
        className,
      )}
    >
      {arrivalStateLabel(state)}
    </span>
  );
}
