"use client";

import { QueueIntelligencePanel } from "@/components/queue";
import { useAppointmentQueueIntelligence } from "@/hooks/use-appointment-queue-intelligence";
import { isAppointmentArrivalWindowOpen } from "@/lib/appointment-arrival";
import type { AppointmentRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type VisitLiveStatusPanelProps = {
  appointment: AppointmentRecord;
  mode?: "customer" | "staff";
  className?: string;
};

/**
 * Customer/staff live shop snapshot for one visit — queue, chair, calm late copy.
 */
export function VisitLiveStatusPanel({
  appointment,
  mode = "customer",
  className,
}: VisitLiveStatusPanelProps) {
  const windowOpen =
    appointment.status === "confirmed" &&
    isAppointmentArrivalWindowOpen(appointment);

  const { data, loading, error, lastSyncedAt, syncing } =
    useAppointmentQueueIntelligence(appointment.id, { enabled: windowOpen });

  if (!windowOpen || appointment.status !== "confirmed") {
    return null;
  }

  return (
    <QueueIntelligencePanel
      mode={mode}
      data={data}
      loading={loading}
      error={error}
      lastSyncedAt={lastSyncedAt}
      syncing={syncing}
      variant="live"
      showVisibilityStrip
      showLiveSync
      showPositionRail
      className={cn("px-4 py-5 sm:px-5", className)}
      headingId={`visit-live-${appointment.id}`}
    />
  );
}
