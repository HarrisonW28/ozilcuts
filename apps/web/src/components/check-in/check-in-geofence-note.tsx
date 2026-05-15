"use client";

import { GeofenceArrivalAssist } from "@/components/geofence";
import type { AppointmentRecord } from "@ozilcuts/types";

type CheckInGeofenceNoteProps = {
  appointment: AppointmentRecord;
  arrivalLocationOptIn: boolean | null;
  proximityBanner: string | null;
  autoCheckInBusy: boolean;
  canGeofenceAuto: boolean;
  autoWindowOpen: boolean;
};

/** @deprecated Use `GeofenceArrivalAssist` from `@/components/geofence`. */
export function CheckInGeofenceNote({
  appointment,
  arrivalLocationOptIn,
  proximityBanner,
  autoCheckInBusy,
}: CheckInGeofenceNoteProps) {
  return (
    <GeofenceArrivalAssist
      mode="customer"
      appointment={appointment}
      arrivalLocationOptIn={arrivalLocationOptIn}
      proximityBanner={proximityBanner}
      autoCheckInBusy={autoCheckInBusy}
      lastResult={null}
    />
  );
}
