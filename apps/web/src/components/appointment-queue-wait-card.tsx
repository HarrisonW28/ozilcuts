"use client";

import { QueueIntelligencePanel } from "@/components/queue";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";

export type AppointmentQueueWaitCardProps = {
  mode: "customer" | "staff";
  data: AppointmentQueueIntelligenceResponse | null;
  loading: boolean;
  error: string | null;
  lastSyncedAt?: number | null;
  syncing?: boolean;
  showLiveSync?: boolean;
  className?: string;
};

/** @deprecated Prefer `QueueIntelligencePanel` — kept for existing imports. */
export function AppointmentQueueWaitCard({
  mode,
  data,
  loading,
  error,
  lastSyncedAt,
  syncing,
  showLiveSync = false,
  className,
}: AppointmentQueueWaitCardProps) {
  return (
    <QueueIntelligencePanel
      mode={mode}
      data={data}
      loading={loading}
      error={error}
      lastSyncedAt={lastSyncedAt}
      syncing={syncing}
      showLiveSync={showLiveSync}
      variant="card"
      headingId="queue-wait-heading"
      className={className}
    />
  );
}
