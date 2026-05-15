"use client";

import { Button, cn } from "@ozilcuts/ui";
import { Sparkles } from "lucide-react";

type SmartSlotHintsErrorProps = {
  onRetry: () => void;
  className?: string;
};

export function SmartSlotHintsError({ onRetry, className }: SmartSlotHintsErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 dark:border-amber-400/30 dark:bg-amber-500/[0.08]",
        className,
      )}
    >
      <div className="flex gap-3">
        <Sparkles
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-200"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Couldn&apos;t load smart suggestions
          </p>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            You can still pick any open time — retry to bring back personalized
            ranking and hints.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={onRetry}
      >
        Retry suggestions
      </Button>
    </div>
  );
}
