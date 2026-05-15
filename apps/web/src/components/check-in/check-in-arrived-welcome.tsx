"use client";

import { CheckCircle2 } from "lucide-react";

export function CheckInArrivedWelcome() {
  return (
    <div className="check-in-welcome-card" role="status">
      <CheckCircle2
        className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
          You are checked in
        </p>
        <p className="text-caption leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
          Thank you for letting us know you are here. Settle in nearby — your
          barber will welcome you to the chair when it is time.
        </p>
      </div>
    </div>
  );
}
