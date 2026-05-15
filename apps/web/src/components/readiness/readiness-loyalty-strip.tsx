"use client";

import { formatHistoryWhen, tierPresentation } from "@/lib/customer-recognition";
import type { AppointmentCustomerInsightsResponse } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Heart, Sparkles, UserRound } from "lucide-react";

type ReadinessLoyaltyStripProps = {
  insights: Extract<
    AppointmentCustomerInsightsResponse,
    { linked_customer: true }
  >;
};

export function ReadinessLoyaltyStrip({ insights }: ReadinessLoyaltyStripProps) {
  const tier = tierPresentation(insights.recognition_tier);
  const { summary } = insights;

  return (
    <div
      className="readiness-loyalty-strip"
      role="list"
      aria-label="Loyalty and visit rhythm"
    >
      <span
        className={cn("readiness-loyalty-chip", tier.className)}
        role="listitem"
      >
        {tier.label}
      </span>
      <span
        className="readiness-loyalty-chip border-border/50 bg-muted/25 font-medium normal-case tracking-normal text-muted-foreground"
        role="listitem"
      >
        <UserRound className="size-3.5 shrink-0" aria-hidden />
        {summary.total_visits} visit{summary.total_visits === 1 ? "" : "s"}
      </span>
      {insights.visits_with_this_barber > 0 ? (
        <span
          className="readiness-loyalty-chip border-border/50 bg-muted/25 font-medium normal-case tracking-normal text-muted-foreground"
          role="listitem"
        >
          {insights.visits_with_this_barber} with you
        </span>
      ) : null}
      {insights.prefers_you ? (
        <span
          className="readiness-loyalty-chip border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100"
          role="listitem"
        >
          <Heart className="size-3.5 shrink-0" aria-hidden />
          Usually picks you
        </span>
      ) : null}
      {summary.last_visit_at ? (
        <span
          className="readiness-loyalty-chip border-border/50 bg-muted/25 font-medium normal-case tracking-normal text-muted-foreground"
          role="listitem"
        >
          Last {formatHistoryWhen(summary.last_visit_at)}
        </span>
      ) : null}
      {summary.avg_interval_days != null ? (
        <span
          className="readiness-loyalty-chip border-border/50 bg-muted/25 font-medium normal-case tracking-normal text-muted-foreground"
          role="listitem"
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          ~{summary.avg_interval_days}d cadence
        </span>
      ) : null}
    </div>
  );
}
