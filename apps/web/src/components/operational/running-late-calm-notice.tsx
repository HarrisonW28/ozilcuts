"use client";

import { cn } from "@ozilcuts/ui";
import { Timer } from "lucide-react";

type RunningLateCalmNoticeProps = {
  className?: string;
  /** Staff sees operational framing; guests see reassurance. */
  mode?: "customer" | "staff";
  visitsBehindSchedule?: number;
};

/**
 * Reassuring copy when the day is running behind — no alarmist tone.
 */
export function RunningLateCalmNotice({
  className,
  mode = "customer",
  visitsBehindSchedule = 0,
}: RunningLateCalmNoticeProps) {
  if (visitsBehindSchedule <= 0 && mode === "customer") {
    return null;
  }

  const body =
    mode === "staff"
      ? visitsBehindSchedule > 0
        ? "A few visits are easing back on schedule — guests on check-in see a calm heads-up."
        : "If you are running behind, use the running-late notice on a visit card so your guest gets a gentle text."
      : "The shop is running a little behind today — your barber is steering the queue and will keep you posted here.";

  return (
    <div
      className={cn("operational-running-late-notice flex gap-3", className)}
      role="status"
    >
      <Timer
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden
      />
      <p className="min-w-0 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
