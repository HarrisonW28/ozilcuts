"use client";

import type { BarberSmartSlotCancellationMatch } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Undo2 } from "lucide-react";

type SmartSlotHintsCancellationProps = {
  match: BarberSmartSlotCancellationMatch;
  className?: string;
};

export function SmartSlotHintsCancellation({
  match,
  className,
}: SmartSlotHintsCancellationProps) {
  if (!match.hint) return null;
  const { recent_cancellations_on_day } = match;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3 dark:border-amber-400/25 dark:bg-amber-500/[0.09]",
        className,
      )}
    >
      <Undo2
        className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-100"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-micro font-semibold uppercase tracking-wide text-amber-950/90 dark:text-amber-50/95">
          Cancellation match
          {recent_cancellations_on_day > 1 ? (
            <span className="ms-1.5 font-normal normal-case text-amber-900/85 dark:text-amber-100/90">
              · {recent_cancellations_on_day} reopenings today
            </span>
          ) : null}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/95">
          {match.hint}
        </p>
      </div>
    </div>
  );
}
