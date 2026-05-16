"use client";

import type { BarberTrustSummary } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

type BarberTrustBookingStripProps = {
  trust: BarberTrustSummary;
  barberUserId: number;
  className?: string;
};

export function BarberTrustBookingStrip({
  trust,
  barberUserId,
  className,
}: BarberTrustBookingStripProps) {
  const repeatPct =
    trust.repeat_metrics.unique_customers > 0
      ? Math.round(trust.repeat_metrics.repeat_rate * 100)
      : null;

  const hasSignals =
    trust.average_rating !== null ||
    trust.repeat_metrics.verified_visits > 0 ||
    trust.highlights.length > 0;

  if (!hasSignals) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/30 bg-primary/[0.06] p-3 dark:bg-primary/[0.1]",
        className,
      )}
      role="region"
      aria-label="Barber trust signals"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck className="size-3.5" aria-hidden />
          Why guests book here
        </p>
        <Link
          href={`/barbers/${barberUserId}#barber-trust-heading`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Full profile
        </Link>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2" role="list">
        {trust.average_rating !== null && trust.review_count > 0 ? (
          <li className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
            <Star className="size-3 fill-primary text-primary" aria-hidden />
            {trust.average_rating.toFixed(1)} · {trust.review_count} verified
          </li>
        ) : null}
        {repeatPct !== null && repeatPct >= 20 ? (
          <li className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
            {repeatPct}% repeat guests
          </li>
        ) : null}
        {trust.portfolio.before_after_pair_count > 0 ? (
          <li className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
            <BadgeCheck className="size-3 text-primary" aria-hidden />
            Before/after on file
          </li>
        ) : null}
        {trust.highlights.slice(0, 2).map((line) => (
          <li
            key={line}
            className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs text-foreground/90"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
