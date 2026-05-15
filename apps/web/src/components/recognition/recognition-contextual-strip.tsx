"use client";

import { RecognitionTierBadge } from "@/components/recognition/recognition-tier-badge";
import { RecognitionHairPreferences } from "@/components/recognition/recognition-hair-preferences";
import { useAppointmentCustomerInsights } from "@/hooks/use-appointment-customer-insights";
import { compactHairPreferenceSummary } from "@/lib/customer-recognition";
import { cn } from "@ozilcuts/ui";
import { Heart } from "lucide-react";
import Link from "next/link";

type RecognitionContextualStripProps = {
  appointmentId: number;
  currentServiceId?: number | null;
  enabled?: boolean;
  className?: string;
};

export function RecognitionContextualStrip({
  appointmentId,
  currentServiceId,
  enabled = true,
  className,
}: RecognitionContextualStripProps) {
  const { data, loading, error } = useAppointmentCustomerInsights(appointmentId, {
    enabled,
  });

  if (!enabled) return null;

  if (loading) {
    return (
      <div
        className={cn("recognition-contextual-strip recognition-contextual-strip--loading", className)}
        aria-busy="true"
        aria-label="Loading guest context"
      >
        <div className="h-4 w-24 rounded bg-muted/50" />
        <div className="mt-2 h-3 w-full max-w-xs rounded bg-muted/40" />
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.linked_customer) {
    return (
      <p
        className={cn(
          "recognition-contextual-strip text-caption text-muted-foreground",
          className,
        )}
      >
        Walk-in — no linked account for visit history.
      </p>
    );
  }

  const hairSummary = compactHairPreferenceSummary(data.hair_preferences);
  const topFavorite = data.favorite_services[0];
  const todayFavorite =
    currentServiceId != null &&
    data.favorite_services.some((r) => r.service_id === currentServiceId);

  return (
    <div
      className={cn("recognition-contextual-strip space-y-2", className)}
      aria-label="Guest recognition context"
    >
      <div className="flex flex-wrap items-center gap-2">
        <RecognitionTierBadge tier={data.recognition_tier} compact />
        <span className="text-caption tabular-nums text-muted-foreground">
          {data.summary.total_visits} visit{data.summary.total_visits === 1 ? "" : "s"}
          {" · "}
          {data.visits_with_this_barber} with you
        </span>
        {data.prefers_you ? (
          <span className="inline-flex items-center gap-1 text-micro font-medium text-rose-700 dark:text-rose-200">
            <Heart className="size-3 shrink-0" aria-hidden />
            Picks you
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption text-muted-foreground">
        {topFavorite && !todayFavorite ? (
          <span>
            Often books <span className="font-medium text-foreground">{topFavorite.service_name}</span>
          </span>
        ) : null}
        {todayFavorite ? (
          <span className="font-medium text-primary">Favourite service today</span>
        ) : null}
        {hairSummary ? (
          <span className="min-w-0 truncate" title={hairSummary}>
            {hairSummary}
          </span>
        ) : null}
        <Link
          href={`/appointments/${appointmentId}/confirmation`}
          className="shrink-0 font-medium text-primary underline-offset-4 hover:underline"
        >
          Full snapshot
        </Link>
      </div>
      {data.hair_preferences && !hairSummary ? (
        <RecognitionHairPreferences preferences={data.hair_preferences} compact />
      ) : null}
    </div>
  );
}
