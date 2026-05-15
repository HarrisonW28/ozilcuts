"use client";

import { RecognitionFavoriteServices } from "@/components/recognition/recognition-favorite-services";
import { RecognitionHairPreferences } from "@/components/recognition/recognition-hair-preferences";
import { RecognitionHistoryPreview } from "@/components/recognition/recognition-history-preview";
import { RecognitionTierBadge } from "@/components/recognition/recognition-tier-badge";
import { RecognitionVisitStats } from "@/components/recognition/recognition-visit-stats";
import { useAppointmentCustomerInsights } from "@/hooks/use-appointment-customer-insights";
import { tierPresentation } from "@/lib/customer-recognition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import { Heart, Sparkles, UserRound } from "lucide-react";

export type CustomerRecognitionPanelProps = {
  appointmentId: number;
  currentServiceId?: number | null;
  enabled: boolean;
  className?: string;
};

export function CustomerRecognitionPanel({
  appointmentId,
  currentServiceId,
  enabled,
  className,
}: CustomerRecognitionPanelProps) {
  const { data, loading, error } = useAppointmentCustomerInsights(appointmentId, {
    enabled,
  });

  if (!enabled) return null;

  if (loading) {
    return (
      <Card
        className={cn(
          "border-border/50 shadow-none dark:border-border/40",
          className,
        )}
        aria-busy="true"
        aria-live="polite"
      >
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="mt-2 h-4 w-full max-w-md rounded-md" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          "border-destructive/25 bg-destructive/[0.03] shadow-none",
          className,
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Guest snapshot</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) return null;

  if (!data.linked_customer) {
    return (
      <Card
        className={cn(
          "border-border/50 bg-muted/10 shadow-none dark:border-border/40",
          className,
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            Guest snapshot
          </CardTitle>
          <CardDescription>
            This booking has no linked account yet — walk-in details live in
            notes and photos only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tier = tierPresentation(data.recognition_tier);

  return (
    <Card
      className={cn(
        "border-primary/20 bg-primary/[0.02] shadow-none dark:border-primary/15 dark:bg-primary/[0.04]",
        className,
      )}
      aria-label="Guest recognition snapshot"
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Guest snapshot</CardTitle>
            <CardDescription>
              Quiet context for this chair — visits, favourites, and how they
              like to book.
            </CardDescription>
          </div>
          <RecognitionTierBadge tier={data.recognition_tier} />
        </div>
        <p className="text-caption leading-relaxed text-muted-foreground">
          {tier.hint}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <RecognitionVisitStats
          summary={data.summary}
          visitsWithThisBarber={data.visits_with_this_barber}
        />

        <div className="flex flex-wrap gap-2">
          {data.prefers_you ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-micro font-semibold uppercase tracking-widecaps text-rose-950 dark:text-rose-100">
              <Heart className="size-3.5 shrink-0" aria-hidden />
              Usually picks you
            </span>
          ) : null}
          {data.summary.avg_interval_days != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/25 px-2.5 py-1 text-micro font-medium text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              Averages {data.summary.avg_interval_days} days between visits
            </span>
          ) : null}
        </div>

        {data.booking_preferences_note ? (
          <div className="rounded-xl border border-border/45 bg-background/70 p-3 dark:bg-background/50">
            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
              In their words
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {data.booking_preferences_note}
            </p>
            <p className="mt-2 text-caption text-muted-foreground">
              From their profile — pair with hair profile fields below.
            </p>
          </div>
        ) : null}

        <RecognitionHairPreferences preferences={data.hair_preferences} />

        <RecognitionFavoriteServices
          rows={data.favorite_services}
          currentServiceId={currentServiceId}
        />

        <RecognitionHistoryPreview rows={data.history_preview} />
      </CardContent>
    </Card>
  );
}
