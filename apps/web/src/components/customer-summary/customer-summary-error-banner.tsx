"use client";

import { Button, cn } from "@ozilcuts/ui";
import { AlertCircle } from "lucide-react";

type CustomerSummaryErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function CustomerSummaryErrorBanner({
  message,
  onRetry,
  className,
}: CustomerSummaryErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4 dark:border-destructive/35 dark:bg-destructive/[0.09]",
        className,
      )}
    >
      <div className="flex gap-3">
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
        <p className="min-w-0 text-sm leading-relaxed text-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
