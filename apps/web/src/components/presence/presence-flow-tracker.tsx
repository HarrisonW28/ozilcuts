"use client";

import { ArrivalFlowStrip } from "@/components/arrival-flow-strip";
import type { AppointmentArrivalState } from "@ozilcuts/types";

type PresenceFlowTrackerProps = {
  state: AppointmentArrivalState;
  compact?: boolean;
  className?: string;
};

export function PresenceFlowTracker({
  state,
  compact = true,
  className,
}: PresenceFlowTrackerProps) {
  return (
    <ArrivalFlowStrip state={state} compact={compact} className={className} />
  );
}
