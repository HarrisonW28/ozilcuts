"use client";

import { hairPreferenceLines } from "@/lib/customer-recognition";
import type { CustomerHairPreferencesSnapshot } from "@ozilcuts/types";
import { Scissors } from "lucide-react";
import { cn } from "@ozilcuts/ui";

type RecognitionHairPreferencesProps = {
  preferences: CustomerHairPreferencesSnapshot | null;
  compact?: boolean;
  className?: string;
};

export function RecognitionHairPreferences({
  preferences,
  compact = false,
  className,
}: RecognitionHairPreferencesProps) {
  if (!preferences) return null;

  const lines = hairPreferenceLines(preferences);
  if (lines.length === 0) return null;

  if (compact) {
    return (
      <p className={cn("text-caption leading-snug text-muted-foreground", className)}>
        <Scissors className="mr-1 inline size-3.5 align-text-bottom opacity-70" aria-hidden />
        {lines.map((l) => l.value).join(" · ")}
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        <Scissors className="size-3.5" aria-hidden />
        Hair preferences
      </p>
      <ul className="recognition-hair-prefs-grid" aria-label="Hair preferences">
        {lines.map((line) => (
          <li key={line.label} className="recognition-hair-pref-line">
            <p className="text-micro font-medium text-muted-foreground">{line.label}</p>
            <p className="mt-0.5 text-sm leading-snug text-foreground">{line.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
