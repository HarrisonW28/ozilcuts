"use client";

import { ReadinessCustomerSummary } from "@/components/readiness/readiness-customer-summary";
import { ReadinessGuestContext } from "@/components/readiness/readiness-guest-context";
import { ReadinessHairReferences } from "@/components/readiness/readiness-hair-references";
import { ReadinessLoyaltyStrip } from "@/components/readiness/readiness-loyalty-strip";
import { ReadinessNotesPreview } from "@/components/readiness/readiness-notes-preview";
import { ReadinessSkeleton } from "@/components/readiness/readiness-skeleton";
import { ReadinessVisitPhotos } from "@/components/readiness/readiness-visit-photos";
import { useBarberReadiness } from "@/hooks/use-barber-readiness";
import { linkedInsights, readinessConfirmationBase } from "@/lib/barber-readiness";
import { tierPresentation } from "@/lib/customer-recognition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { RecognitionTierBadge } from "@/components/recognition";

export type ReadinessPanelProps = {
  appointmentId: number;
  customerUserId?: number | null;
  currentServiceId?: number | null;
  enabled: boolean;
  className?: string;
};

export function ReadinessPanel({
  appointmentId,
  customerUserId,
  currentServiceId,
  enabled,
  className,
}: ReadinessPanelProps) {
  const {
    insights,
    hairProfile,
    visitPhotos,
    notes,
    aiSummary,
    isInitialLoading,
    retryAiSummary,
  } = useBarberReadiness({
    appointmentId,
    customerUserId,
    enabled,
  });

  const confirmationBase = readinessConfirmationBase(appointmentId);
  const linked = linkedInsights(
    insights.status === "ok" ? insights.data : null,
  );
  const tierMeta = linked ? tierPresentation(linked.recognition_tier) : null;

  if (!enabled) return null;

  if (isInitialLoading) {
    return <ReadinessSkeleton className={className} />;
  }

  return (
    <Card
      className={cn("readiness-panel", className)}
      aria-label="Barber preparation context"
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Chair prep</CardTitle>
            <CardDescription>
              Summary, loyalty, references, and notes — open full details when you
              need more room.
            </CardDescription>
          </div>
          {linked ? <RecognitionTierBadge tier={linked.recognition_tier} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {insights.status === "error" ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3 py-2 text-sm text-destructive">
            {insights.message}
          </p>
        ) : null}

        <ReadinessCustomerSummary
          slice={aiSummary}
          confirmationHref={confirmationBase}
          variant="compact"
          onRetry={retryAiSummary}
        />

        {linked ? (
          <>
            {tierMeta?.hint ? (
              <p className="text-caption leading-relaxed text-muted-foreground">
                {tierMeta.hint}
              </p>
            ) : null}
            <ReadinessLoyaltyStrip insights={linked} />
            <ReadinessGuestContext
              insights={insights}
              currentServiceId={currentServiceId}
              confirmationBase={confirmationBase}
            />
          </>
        ) : (
          <ReadinessGuestContext
            insights={insights}
            currentServiceId={currentServiceId}
            confirmationBase={confirmationBase}
          />
        )}

        <div className="readiness-scan-grid">
          <ReadinessHairReferences
            slice={hairProfile}
            confirmationBase={confirmationBase}
          />
          <ReadinessVisitPhotos
            slice={visitPhotos}
            confirmationBase={confirmationBase}
          />
        </div>

        <ReadinessNotesPreview
          slice={notes}
          customerUserId={customerUserId}
          confirmationBase={confirmationBase}
        />
      </CardContent>
    </Card>
  );
}
