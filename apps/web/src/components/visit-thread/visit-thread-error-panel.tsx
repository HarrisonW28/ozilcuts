"use client";

import { Button } from "@ozilcuts/ui";
import { AlertCircle } from "lucide-react";

type VisitThreadErrorPanelProps = {
  message: string;
  onRetry: () => void;
};

export function VisitThreadErrorPanel({
  message,
  onRetry,
}: VisitThreadErrorPanelProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4 dark:bg-destructive/[0.09]"
    >
      <div className="flex gap-3">
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
        <p className="min-w-0 text-sm leading-relaxed text-foreground">
          {message}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start min-h-11 touch-manipulation sm:min-h-9"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
