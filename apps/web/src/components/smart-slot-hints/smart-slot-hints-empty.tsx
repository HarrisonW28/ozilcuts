"use client";

import { cn } from "@ozilcuts/ui";
import { TrendingUp } from "lucide-react";

type SmartSlotHintsEmptyVariant = "customer" | "staff";

type SmartSlotHintsEmptyProps = {
  variant: SmartSlotHintsEmptyVariant;
  className?: string;
};

export function SmartSlotHintsEmpty({ variant, className }: SmartSlotHintsEmptyProps) {
  const title =
    variant === "customer"
      ? "Building your smart picks"
      : "Customer-smart picks";
  const body =
    variant === "customer"
      ? "After a few visits we’ll highlight your usual times, predict your next cut, and rank openings that match how you book."
      : "When your client books while signed in, they’ll see affinity, preferred hours, and return-day predictions here.";

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-3 dark:bg-muted/15",
        className,
      )}
    >
      <TrendingUp
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
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
