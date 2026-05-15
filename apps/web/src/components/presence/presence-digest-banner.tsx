"use client";

import { Button, cn } from "@ozilcuts/ui";
import { Sparkles } from "lucide-react";

type PresenceDigestBannerProps = {
  message: string | null;
  onDismiss: () => void;
  className?: string;
};

export function PresenceDigestBanner({
  message,
  onDismiss,
  className,
}: PresenceDigestBannerProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("presence-digest-banner", className)}
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-background/70 dark:bg-background/50">
        <Sparkles className="size-4 text-teal-700 dark:text-teal-200" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-micro font-semibold uppercase tracking-wide text-teal-900/90 dark:text-teal-100/90">
          Floor update
        </p>
        <p className="mt-1 text-sm leading-snug text-foreground">{message}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-10 shrink-0 touch-manipulation text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </div>
  );
}
