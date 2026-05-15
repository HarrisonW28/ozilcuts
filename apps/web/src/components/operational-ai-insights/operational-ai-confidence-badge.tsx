"use client";

import type { OperationalAiInsightConfidence } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

import { operationalConfidenceLabel } from "@/lib/operational-ai-insights-display";

type OperationalAiConfidenceBadgeProps = {
  confidence: OperationalAiInsightConfidence;
  className?: string;
};

export function OperationalAiConfidenceBadge({
  confidence,
  className,
}: OperationalAiConfidenceBadgeProps) {
  const styles = {
    high: "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50",
    medium: "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-50",
    low: "border-border/60 bg-muted/40 text-muted-foreground",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-micro font-semibold uppercase tracking-wide tabular-nums",
        styles[confidence],
        className,
      )}
    >
      {confidence}
    </span>
  );
}

export function OperationalAiConfidenceScreenReader({
  confidence,
}: {
  confidence: OperationalAiInsightConfidence;
}) {
  return (
    <span className="sr-only">{operationalConfidenceLabel(confidence)}</span>
  );
}
