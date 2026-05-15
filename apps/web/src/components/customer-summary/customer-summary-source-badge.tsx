"use client";

import { cn } from "@ozilcuts/ui";

type CustomerSummarySourceBadgeProps = {
  source: "model" | "rules";
  className?: string;
};

export function CustomerSummarySourceBadge({
  source,
  className,
}: CustomerSummarySourceBadgeProps) {
  const isModel = source === "model";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:text-micro",
        isModel
          ? "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100"
          : "border-border/50 bg-muted/25 text-muted-foreground",
        className,
      )}
    >
      {isModel ? "AI-assisted" : "On-shop rules"}
    </span>
  );
}
