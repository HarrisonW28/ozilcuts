"use client";

import type {
  BarberTrustConsistencyLevel,
  BarberTrustSummary,
} from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import {
  BadgeCheck,
  Camera,
  RefreshCw,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

type BarberTrustPanelProps = {
  trust: BarberTrustSummary;
  barberName: string;
  portfolioHref: string;
  className?: string;
};

function levelStyles(level: BarberTrustConsistencyLevel): string {
  switch (level) {
    case "strong":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
    case "good":
      return "border-primary/30 bg-primary/10 text-foreground";
    case "building":
    default:
      return "border-border/55 bg-muted/25 text-muted-foreground";
  }
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < full
              ? "fill-primary text-primary"
              : "fill-muted/30 text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

export function BarberTrustPanel({
  trust,
  barberName,
  portfolioHref,
  className,
}: BarberTrustPanelProps) {
  const { repeat_metrics: repeat, portfolio } = trust;
  const repeatPct =
    repeat.unique_customers > 0
      ? Math.round(repeat.repeat_rate * 100)
      : null;

  return (
    <section
      aria-labelledby="barber-trust-heading"
      className={cn("space-y-4", className)}
    >
      <Card className="dashboard-surface motion-card overflow-hidden border-primary/25">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle id="barber-trust-heading" className="text-lg">
                  Book with confidence
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Verified signals from real visits with {barberName}.
                </CardDescription>
              </div>
            </div>
            {trust.average_rating !== null && trust.review_count > 0 ? (
              <div className="text-right">
                <p className="flex items-center justify-end gap-1.5 text-2xl font-semibold tabular-nums text-foreground">
                  {trust.average_rating.toFixed(1)}
                  <Stars rating={trust.average_rating} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {trust.review_count} verified review
                  {trust.review_count === 1 ? "" : "s"}
                </p>
              </div>
            ) : null}
          </div>

          {trust.highlights.length > 0 ? (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Trust highlights"
            >
              {trust.highlights.map((line) => (
                <li
                  key={line}
                  className="rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-foreground/90"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                Repeat guests
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {repeatPct !== null ? `${repeatPct}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {repeat.repeat_customers} of {repeat.unique_customers} guests
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RefreshCw className="size-3.5" aria-hidden />
                Visits
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {repeat.verified_visits}
              </p>
              <p className="text-xs text-muted-foreground">Completed cuts</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border/50 bg-muted/10 p-3 sm:col-span-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Camera className="size-3.5" aria-hidden />
                Portfolio
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {portfolio.public_photo_count}
              </p>
              <p className="text-xs text-muted-foreground">
                {portfolio.before_after_pair_count > 0
                  ? `${portfolio.before_after_pair_count} before/after set${portfolio.before_after_pair_count === 1 ? "" : "s"}`
                  : portfolio.has_recent_work
                    ? "Updated recently"
                    : "Guest-consented photos"}
              </p>
            </div>
          </div>

          {trust.specialties.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Specialties
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2" role="list">
                {trust.specialties.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-sm font-medium text-foreground dark:bg-primary/12"
                  >
                    {label}
                  </li>
                ))}
              </ul>
              {trust.specialties_source === "inferred" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Based on this barber&apos;s most-booked services.
                </p>
              ) : null}
            </div>
          ) : null}

          {trust.consistency.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consistency
              </h3>
              <ul className="mt-2 space-y-2" role="list">
                {trust.consistency.map((row) => (
                  <li
                    key={row.key}
                    className="flex flex-col gap-1 rounded-xl border border-border/45 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {row.label}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {row.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex w-fit shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        levelStyles(row.level),
                      )}
                    >
                      {row.value_label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {portfolio.public_photo_count > 0 ? (
            <p className="text-sm text-muted-foreground">
              <Link
                href={portfolioHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                View portfolio
              </Link>
              {portfolio.guest_consent_photos
                ? " — every public photo has guest consent."
                : "."}
            </p>
          ) : null}

          {trust.reviews.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Verified reviews
              </h3>
              <ul className="mt-3 space-y-3" role="list">
                {trust.reviews.map((review) => (
                  <li key={review.id}>
                    <blockquote className="rounded-xl border border-border/50 bg-muted/10 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Stars rating={review.rating} />
                          <span className="sr-only">
                            {review.rating} out of 5 stars
                          </span>
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <BadgeCheck className="size-3.5" aria-hidden />
                          Verified visit
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        &ldquo;{review.body}&rdquo;
                      </p>
                      <footer className="mt-3 text-xs text-muted-foreground">
                        {review.customer_display_name}
                        {review.service_name
                          ? ` · ${review.service_name}`
                          : ""}
                      </footer>
                    </blockquote>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Verified guest reviews will appear here after completed visits.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
