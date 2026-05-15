"use client";

import {
  HistoryPreviewRow,
  RecognitionFavoriteServices,
  RecognitionHairPreferences,
  RecognitionVisitStats,
} from "@/components/recognition";
import {
  READINESS_MAX_HISTORY_ROWS,
  type LoadSlice,
} from "@/lib/barber-readiness";
import type { AppointmentCustomerInsightsResponse } from "@ozilcuts/types";
import { History } from "lucide-react";
import Link from "next/link";

type ReadinessGuestContextProps = {
  insights: LoadSlice<AppointmentCustomerInsightsResponse>;
  currentServiceId?: number | null;
  confirmationBase: string;
};

export function ReadinessGuestContext({
  insights,
  currentServiceId,
  confirmationBase,
}: ReadinessGuestContextProps) {
  if (insights.status !== "ok") return null;

  if (!insights.data.linked_customer) {
    return (
      <div className="readiness-section-block">
        <p className="text-sm font-medium text-foreground">
          Walk-in / no linked account
        </p>
        <p className="mt-1 text-caption text-muted-foreground">
          Loyalty and staff notes need a linked customer — hair references and this
          visit’s photos still load below.
        </p>
      </div>
    );
  }

  const linked = insights.data;

  return (
    <div className="space-y-3">
      <RecognitionVisitStats
        summary={linked.summary}
        visitsWithThisBarber={linked.visits_with_this_barber}
        compact
      />
      {linked.booking_preferences_note ? (
        <div className="readiness-section-block">
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            In their words
          </p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {linked.booking_preferences_note}
          </p>
        </div>
      ) : null}
      <RecognitionHairPreferences preferences={linked.hair_preferences} compact />
      <RecognitionFavoriteServices
        rows={linked.favorite_services}
        currentServiceId={currentServiceId}
        compact
      />
      {linked.history_preview.length > 0 ? (
        <div>
          <p className="mb-1 flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            Recent history
          </p>
          <ul className="readiness-section-block space-y-0 p-2">
            {linked.history_preview.slice(0, READINESS_MAX_HISTORY_ROWS).map((row) => (
              <HistoryPreviewRow key={row.id} row={row} />
            ))}
          </ul>
          {linked.history_preview.length > READINESS_MAX_HISTORY_ROWS ? (
            <p className="mt-2 text-center text-caption text-muted-foreground">
              <Link
                href={confirmationBase}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                View full history on booking details
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No earlier visits on file.</p>
      )}
    </div>
  );
}
