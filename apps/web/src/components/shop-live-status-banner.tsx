"use client";

import type { LiveShopSummary } from "@/lib/shop-live-status";
import { cn } from "@ozilcuts/ui";
import { Armchair, Users } from "lucide-react";

type ShopLiveStatusBannerProps = {
  summary: LiveShopSummary;
  className?: string;
  /** Barber readiness line — keeps floor status and personal mode aligned. */
  barberPresenceNote?: string | null;
};

/**
 * Calm, glanceable strip for barber home — chair, lounge, and next slot.
 */
export function ShopLiveStatusBanner({
  summary,
  className,
  barberPresenceNote,
}: ShopLiveStatusBannerProps) {
  const { serving, waitingCount, behindCount, next, nextStartsInMinutes } =
    summary;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-gradient-to-br from-muted/40 via-background to-muted/25 px-4 py-4 shadow-xs dark:border-border/45 dark:from-muted/25 dark:via-background dark:to-muted/15 sm:px-5 sm:py-5",
        className,
      )}
      role="region"
      aria-label="Live shop status"
    >
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-3">
        <div className="flex gap-3 sm:flex-col sm:gap-1.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 dark:bg-background/50">
            <Armchair className="size-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
              Chair
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
              {serving
                ? serving.customer?.name ?? "Guest"
                : "Open — no active visit"}
            </p>
            {serving?.service?.name ? (
              <p className="text-caption text-muted-foreground">
                {serving.service.name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 border-t border-border/35 pt-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 dark:bg-background/50">
            <Users className="size-5 text-sky-600 dark:text-sky-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
              Lounge
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
              {waitingCount === 0
                ? "No one waiting"
                : waitingCount === 1
                  ? "1 guest waiting"
                  : `${waitingCount} guests waiting`}
            </p>
            {behindCount > 0 ? (
              <p className="text-caption text-amber-900/85 dark:text-amber-100/85">
                {behindCount === 1
                  ? "One visit is catching up on time"
                  : `${behindCount} visits are catching up on time`}
              </p>
            ) : (
              <p className="text-caption text-muted-foreground">On time today</p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center border-t border-border/35 pt-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <p className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground">
            Next slot
          </p>
          {next ? (
            <>
              <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                {next.customer?.name ?? "Guest"} ·{" "}
                {next.service?.name ?? "Service"}
              </p>
              <p className="text-caption text-muted-foreground">
                {nextStartsInMinutes != null
                  ? `Starts in about ${nextStartsInMinutes} min`
                  : "Upcoming"}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Nothing else on the books after current visits.
            </p>
          )}
        </div>
      </div>
      {barberPresenceNote ? (
        <p className="mt-4 border-t border-border/30 pt-3 text-center text-caption leading-relaxed text-muted-foreground sm:mt-5 sm:pt-4">
          {barberPresenceNote}
        </p>
      ) : null}
    </div>
  );
}
