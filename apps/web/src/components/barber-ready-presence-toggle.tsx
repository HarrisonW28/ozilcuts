"use client";

import { Button, cn } from "@ozilcuts/ui";
import { Armchair, Focus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const storageKey = (userId: number) => `ozilcuts:barber-ready:${userId}`;

type BarberReadyPresenceToggleProps = {
  userId: number;
  className?: string;
  /** Fires when readiness changes (hydrate + taps). */
  onReadyChange?: (ready: boolean) => void;
};

/**
 * Local-only “presence” for the barber — signals whether they are open to
 * seating the next guest (not synced server-side).
 */
export function BarberReadyPresenceToggle({
  userId,
  className,
  onReadyChange,
}: BarberReadyPresenceToggleProps) {
  const [ready, setReady] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(storageKey(userId));
      const next = raw === "0" ? false : true;
      setReady(next);
      onReadyChange?.(next);
    } catch {
      /* ignore */
    }
  }, [userId, onReadyChange]);

  const persist = useCallback(
    (next: boolean) => {
      setReady(next);
      onReadyChange?.(next);
      try {
        window.sessionStorage.setItem(storageKey(userId), next ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [userId, onReadyChange],
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/15 px-3 py-3 dark:border-border/40 dark:bg-muted/10 sm:px-4 sm:py-3.5",
        className,
      )}
      role="region"
      aria-label="Your readiness for guests"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {ready ? "Ready for guests" : "Heads down"}
          </p>
          <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
            {ready
              ? "Guests see you as available to seat the next arrival — only on this device."
              : "Quiet mode for focus; your queue still updates. Toggle back when you are open to seat."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant={ready ? "default" : "outline"}
            className="min-h-11 flex-1 touch-manipulation sm:min-h-9 sm:flex-none"
            onClick={() => persist(true)}
          >
            <Armchair className="mr-1.5 size-4" aria-hidden />
            Ready
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!ready ? "secondary" : "outline"}
            className="min-h-11 flex-1 touch-manipulation sm:min-h-9 sm:flex-none"
            onClick={() => persist(false)}
          >
            <Focus className="mr-1.5 size-4" aria-hidden />
            Focus
          </Button>
        </div>
      </div>
    </div>
  );
}
