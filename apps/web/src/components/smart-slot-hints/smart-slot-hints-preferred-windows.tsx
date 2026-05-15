"use client";

import type { BarberSmartSlotPreferredWindow } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type SmartSlotHintsPreferredWindowsProps = {
  windows: BarberSmartSlotPreferredWindow[];
  className?: string;
};

export function SmartSlotHintsPreferredWindows({
  windows,
  className,
}: SmartSlotHintsPreferredWindowsProps) {
  if (windows.length === 0) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        Preferred times
      </p>
      <p className="mt-1 text-caption text-muted-foreground">
        Based on when you usually book this cut — we surface matching slots first.
      </p>
      <ul
        className="mt-3 flex flex-wrap gap-2"
        aria-label="Preferred time windows"
      >
        {windows.map((w) => (
          <li key={`${w.hour_start}-${w.hour_end}`}>
            <span
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-3 py-2 text-sm font-medium tabular-nums touch-manipulation",
                "border-primary/35 bg-primary/[0.08] text-foreground shadow-xs",
                "dark:border-primary/30 dark:bg-primary/[0.12]",
              )}
            >
              {w.label}
              {w.weight >= 0.85 ? (
                <span className="ms-1.5 text-caption font-normal text-muted-foreground">
                  · usual
                </span>
              ) : w.weight >= 0.5 ? (
                <span className="ms-1.5 text-caption font-normal text-muted-foreground">
                  · often
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
