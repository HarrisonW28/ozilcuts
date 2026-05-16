"use client";

import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import { formatIsoDateShort } from "@/lib/customer-home";
import type { CustomerRetentionSummary } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { CalendarSync, Sparkles } from "lucide-react";
import Link from "next/link";

type CustomerHomeRetentionPanelProps = {
  summary: CustomerRetentionSummary | null;
};

function toneSurface(tone: CustomerRetentionSummary["nudge"]["tone"]): string {
  switch (tone) {
    case "muted":
      return "border-border/60 bg-muted/10";
    case "urgent":
      return "border-amber-500/35 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-500/10";
    case "warm":
      return "border-primary/35 bg-primary/5 dark:bg-primary/10";
    case "standard":
    default:
      return "border-border/50 bg-muted/15 dark:bg-muted/10";
  }
}

export function CustomerHomeRetentionPanel({
  summary,
}: CustomerHomeRetentionPanelProps) {
  if (summary === null) {
    return null;
  }

  const { nudge, predicted, signals, total_visits, retention_paused } = summary;
  const showCadenceBadges =
    !retention_paused &&
    !summary.has_upcoming_booking &&
    total_visits > 0 &&
    predicted?.source === "predicted";

  return (
    <CustomerHomeSection id="home-retention-heading" title="Your next cut">
      <Card
        className={cn(
          "overflow-hidden shadow-sm motion-safe:transition-colors",
          toneSurface(nudge.tone),
        )}
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-background/80 text-foreground shadow-sm">
              <Sparkles className="size-5" aria-hidden />
            </div>
            {showCadenceBadges ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                {signals.dormant ? (
                  <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
                    Longer than usual
                  </span>
                ) : null}
                {signals.due_soon && !signals.dormant ? (
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-foreground/90 dark:bg-primary/15">
                    In your usual window
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg leading-snug">{nudge.headline}</CardTitle>
            {nudge.body ? (
              <CardDescription className="text-sm leading-relaxed text-foreground/80">
                {nudge.body}
              </CardDescription>
            ) : null}
          </div>
          {predicted?.date && !retention_paused ? (
            <div
              className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-sm dark:bg-background/40"
              aria-label={
                predicted.source === "booked"
                  ? "Booked next visit date"
                  : "Predicted next haircut date"
              }
            >
              <CalendarSync
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {predicted.source === "booked"
                    ? "Booked next visit"
                    : "Predicted timing"}
                </p>
                <p className="tabular-nums font-medium text-foreground">
                  {formatIsoDateShort(predicted.date)}
                </p>
                {predicted.typical_interval_days != null &&
                predicted.source === "predicted" ? (
                  <p className="text-xs text-muted-foreground">
                    Typical gap · ~{predicted.typical_interval_days} days
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {total_visits > 0 && !retention_paused ? (
            <p className="text-xs text-muted-foreground">
              Loyalty snapshot · {total_visits} confirmed visit
              {total_visits === 1 ? "" : "s"}
            </p>
          ) : null}
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 pt-0 sm:flex-row sm:flex-wrap">
          {nudge.cta_href ? (
            <Button
              asChild
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
              variant={nudge.tone === "muted" ? "secondary" : "default"}
            >
              <Link href={nudge.cta_href}>{nudge.cta_label}</Link>
            </Button>
          ) : null}
          {!retention_paused && (signals.dormant || signals.due_soon) ? (
            <Button
              asChild
              variant="outline"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
            >
              <Link href="/profile/notifications">Reminder settings</Link>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </CustomerHomeSection>
  );
}
