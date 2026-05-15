"use client";

import { cn } from "@ozilcuts/ui";
import { Sparkles } from "lucide-react";

type CustomerSummaryEmptyStateProps = {
  /** Linked customer account on the booking */
  linkedCustomer: boolean;
  variant: "compact" | "expanded";
  className?: string;
};

export function CustomerSummaryEmptyState({
  linkedCustomer,
  variant,
  className,
}: CustomerSummaryEmptyStateProps) {
  const title = linkedCustomer ? "Brief is still light" : "Guest booking";
  const body = linkedCustomer
    ? "Add hair profile details, staff notes, or build visit history — we’ll fold them into this brief automatically."
    : "Queue context may still appear when available. Link a customer profile on the booking for haircut preferences, visit summaries, and barber notes.";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-xl border border-dashed border-border/55 bg-muted/10 px-3 py-3 dark:bg-muted/15",
          className,
        )}
      >
        <Sparkles
          className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-violet-500/25 bg-violet-500/[0.04] px-4 py-8 text-center dark:border-violet-400/20 dark:bg-violet-500/[0.06]",
        className,
      )}
    >
      <Sparkles
        className="size-8 text-violet-600 opacity-80 dark:text-violet-300"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-caption leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
