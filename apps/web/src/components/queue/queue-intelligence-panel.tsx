"use client";

import { LiveChairIndicator } from "@/components/operational/live-chair-indicator";
import { QueueVisibilityStrip } from "@/components/operational/queue-visibility-strip";
import { queuePanelLabel } from "@/lib/queue-intelligence";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";
import { Skeleton, cn } from "@ozilcuts/ui";
import { Leaf, Users } from "lucide-react";
import { QueueDelayNotice } from "./queue-delay-notice";
import { QueueLiveSyncStrip } from "./queue-live-sync-strip";
import { QueuePositionRail } from "./queue-position-rail";
import { QueueWaitProgress } from "./queue-wait-progress";

export type QueueIntelligencePanelProps = {
  mode: "customer" | "staff";
  data: AppointmentQueueIntelligenceResponse | null;
  loading: boolean;
  error: string | null;
  lastSyncedAt?: number | null;
  syncing?: boolean;
  variant?: "card" | "embedded" | "live";
  showVisibilityStrip?: boolean;
  showChairIndicator?: boolean;
  showLiveSync?: boolean;
  showPositionRail?: boolean;
  className?: string;
  headingId?: string;
};

export function QueueIntelligencePanel({
  mode,
  data,
  loading,
  error,
  lastSyncedAt = null,
  syncing = false,
  variant = "card",
  showVisibilityStrip = false,
  showChairIndicator = false,
  showLiveSync = false,
  showPositionRail = true,
  className,
  headingId = "queue-intelligence-heading",
}: QueueIntelligencePanelProps) {
  const label = queuePanelLabel(mode);
  const isLive = variant === "live";
  const isEmbedded = variant === "embedded";

  const shellClass = cn(
    isLive && "operational-live-panel space-y-4",
    variant === "card" &&
      "rounded-2xl border border-border/45 bg-gradient-to-b from-muted/25 via-background to-muted/15 px-4 py-5 shadow-xs dark:border-border/40 dark:from-muted/15 dark:via-background dark:to-muted/10 sm:px-5",
    isEmbedded && "space-y-3",
    className,
  );

  return (
    <section className={shellClass} aria-labelledby={headingId}>
      {(isLive || showChairIndicator) && data ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isEmbedded ? (
            <h3
              id={headingId}
              className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground"
            >
              {isLive ? "Live shop status" : label}
            </h3>
          ) : null}
          <LiveChairIndicator inUse={data.chair_in_use} compact />
        </div>
      ) : null}

      {showVisibilityStrip && data ? (
        <QueueVisibilityStrip
          estimatedMinutesAhead={data.estimated_chair_minutes_ahead}
          guestsAheadInArrival={data.guests_ahead_in_arrival}
          loungeGuestsOther={data.lounge_guests_other}
          visitsBehindSchedule={data.visits_behind_schedule}
        />
      ) : null}

      <div className={cn("flex items-start gap-3", isEmbedded && "gap-2.5")}>
        {!isLive && !isEmbedded ? (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/85 dark:bg-background/55"
            aria-hidden
          >
            <Leaf className="size-5 text-emerald-600/90 dark:text-emerald-400/90" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            {!isLive ? (
              <p
                id={!isEmbedded ? headingId : undefined}
                className="text-micro font-semibold uppercase tracking-widecaps text-muted-foreground"
              >
                {label}
              </p>
            ) : null}
            {loading && !data ? (
              <div className="mt-2 space-y-2" aria-busy="true" aria-live="polite">
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
                <Skeleton className="h-3 w-2/3 max-w-sm rounded-md" />
              </div>
            ) : null}
            {error ? (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {error}
              </p>
            ) : null}
            {data ? (
              <p
                className={cn(
                  "text-sm leading-relaxed text-foreground/95",
                  !isLive && "mt-2",
                )}
                aria-live="polite"
              >
                {data.headline}
              </p>
            ) : null}
          </div>

          {showLiveSync ? (
            <QueueLiveSyncStrip
              active
              lastSyncedAt={lastSyncedAt}
              syncing={syncing || (loading && !!data)}
            />
          ) : null}

          {data && showPositionRail ? (
            <QueuePositionRail data={data} />
          ) : null}

          {data ? <QueueWaitProgress data={data} mode={mode} /> : null}

          {data &&
          (data.guests_ahead_in_arrival > 0 ||
            data.lounge_guests_other > 0 ||
            data.is_next_in_line) ? (
            <div className="flex flex-wrap gap-2">
              {data.guests_ahead_in_arrival > 0 ? (
                <span className="queue-intel-chip">
                  <Users className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  {data.guests_ahead_in_arrival === 1
                    ? "One visit ahead in line"
                    : `${data.guests_ahead_in_arrival} visits ahead in line`}
                </span>
              ) : null}
              {data.lounge_guests_other > 0 ? (
                <span className="queue-intel-chip">
                  {data.lounge_guests_other === 1
                    ? "One other guest nearby"
                    : `${data.lounge_guests_other} others nearby`}
                </span>
              ) : null}
              {data.is_next_in_line ? (
                <span className="queue-intel-chip queue-intel-chip--next">
                  Next for the chair
                </span>
              ) : null}
            </div>
          ) : null}

          {data ? (
            <QueueDelayNotice
              mode={mode}
              visitsBehindSchedule={data.visits_behind_schedule}
              paceTone={data.pace_tone}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
