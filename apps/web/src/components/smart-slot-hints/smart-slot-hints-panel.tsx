"use client";

import type { BarberSmartSlotHintsPayload } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Sparkles } from "lucide-react";

import {
  smartSlotHintsHasContent,
  type SmartSlotHintsLoadStatus,
} from "@/lib/smart-slot-hints";

import { SmartSlotHintsAffinity } from "./smart-slot-hints-affinity";
import { SmartSlotHintsCancellation } from "./smart-slot-hints-cancellation";
import { SmartSlotHintsEmpty } from "./smart-slot-hints-empty";
import { SmartSlotHintsError } from "./smart-slot-hints-error";
import { SmartSlotHintsPreferredWindows } from "./smart-slot-hints-preferred-windows";
import { SmartSlotHintsRepeatBooking } from "./smart-slot-hints-repeat-booking";
import { SmartSlotHintsSkeleton } from "./smart-slot-hints-skeleton";

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type SmartSlotHintsPanelContext = "customer" | "staff";

export type SmartSlotHintsPanelProps = {
  hints: BarberSmartSlotHintsPayload | null;
  status: SmartSlotHintsLoadStatus;
  onRetryHints?: () => void;
  /** Logged-in customer vs staff booker — shapes empty-state copy. */
  viewerContext: SmartSlotHintsPanelContext;
  onJumpToPredictedDay: (dateYmd: string) => void;
  className?: string;
};

export function SmartSlotHintsPanel({
  hints,
  status,
  onRetryHints,
  viewerContext,
  onJumpToPredictedDay,
  className,
}: SmartSlotHintsPanelProps) {
  if (status === "idle") return null;

  if (status === "loading") {
    return <SmartSlotHintsSkeleton className={className} />;
  }

  if (status === "error") {
    if (!onRetryHints) return null;
    return <SmartSlotHintsError onRetry={onRetryHints} className={className} />;
  }

  if (!hints) return null;

  const hasContent = smartSlotHintsHasContent(hints);
  const showPersonalizedEmpty = hints.personalized && !hasContent;

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-xs dark:border-primary/18 dark:bg-primary/[0.06] sm:p-5",
        className,
      )}
      role="region"
      aria-label="Smart booking suggestions"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Sparkles
          className="size-6 shrink-0 text-primary dark:text-violet-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Suggestions to book faster
          </h2>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground sm:text-sm">
            {hints.personalized
              ? "Ranked for your history with this barber and service — pick a highlighted time or any open slot."
              : "Open times below; sign in as the guest to unlock personalized ranking."}
          </p>
        </div>
      </div>

      {hasContent ? (
        <div className="mt-5 flex flex-col gap-5">
          {hints.affinity ? (
            <SmartSlotHintsAffinity affinity={hints.affinity} />
          ) : null}

          {hints.preferred_time_windows.length > 0 ? (
            <SmartSlotHintsPreferredWindows windows={hints.preferred_time_windows} />
          ) : null}

          {hints.repeat_booking ? (
            <SmartSlotHintsRepeatBooking
              repeat={hints.repeat_booking}
              formattedDate={formatIsoDate(hints.repeat_booking.predicted_next_date)}
              onJumpToDay={onJumpToPredictedDay}
            />
          ) : null}

          {hints.cancellation_match.recent_cancellations_on_day > 0 ? (
            <SmartSlotHintsCancellation match={hints.cancellation_match} />
          ) : null}
        </div>
      ) : showPersonalizedEmpty ? (
        <div className="mt-5">
          <SmartSlotHintsEmpty variant={viewerContext} />
        </div>
      ) : !hints.personalized ? (
        <div className="mt-5">
          <SmartSlotHintsEmpty variant="staff" />
        </div>
      ) : null}
    </section>
  );
}
