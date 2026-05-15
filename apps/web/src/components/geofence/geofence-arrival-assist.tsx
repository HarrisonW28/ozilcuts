"use client";

import { GeofenceBarberPrepBanner } from "@/components/geofence/geofence-barber-prep-banner";
import { GeofenceEtaChip } from "@/components/geofence/geofence-eta-chip";
import { GeofencePrivacyOptIn } from "@/components/geofence/geofence-privacy-opt-in";
import { GeofenceProximityBanner } from "@/components/geofence/geofence-proximity-banner";
import { hasShopCoordinates, isGeolocationAvailable } from "@/lib/geofence-arrival";
import { isAutoCheckInTimeWindow } from "@/lib/appointment-arrival";
import type {
  AppointmentArrivalProximityResponse,
  AppointmentRecord,
} from "@ozilcuts/types";
import { MapPin } from "lucide-react";
import { cn } from "@ozilcuts/ui";

type GeofenceArrivalAssistProps = {
  mode: "customer" | "staff";
  appointment: AppointmentRecord;
  arrivalLocationOptIn: boolean | null;
  proximityBanner: string | null;
  autoCheckInBusy: boolean;
  lastResult: AppointmentArrivalProximityResponse | null;
  locationDenied?: boolean;
  className?: string;
};

export function GeofenceArrivalAssist({
  mode,
  appointment,
  arrivalLocationOptIn,
  proximityBanner,
  autoCheckInBusy,
  lastResult,
  locationDenied = false,
  className,
}: GeofenceArrivalAssistProps) {
  const shopReady = hasShopCoordinates(appointment);
  const geoAvailable = isGeolocationAvailable();

  if (mode === "staff") {
    return (
      <GeofenceBarberPrepBanner appointment={appointment} className={className} />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {autoCheckInBusy ? (
        <p
          className="text-center text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          Checking you in automatically…
        </p>
      ) : null}

      <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/10 p-4 dark:bg-muted/5">
        <MapPin
          className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Gentle arrival assist
          </p>
          {!geoAvailable ? (
            <p className="text-caption text-muted-foreground">
              Your browser does not support location — tap check-in when you
              arrive.
            </p>
          ) : null}
          {geoAvailable && !shopReady ? (
            <p className="text-caption text-muted-foreground">
              Studio coordinates are not on file yet — use manual check-in.
            </p>
          ) : null}
          {geoAvailable &&
          shopReady &&
          arrivalLocationOptIn === true &&
          isAutoCheckInTimeWindow(appointment) ? (
            <p className="text-caption text-muted-foreground">
              With sharing on, we can check you in near the door during your
              visit window.
            </p>
          ) : null}
          {geoAvailable &&
          shopReady &&
          arrivalLocationOptIn === true &&
          !isAutoCheckInTimeWindow(appointment) ? (
            <p className="text-caption text-muted-foreground">
              Automatic check-in activates closer to your appointment time.
            </p>
          ) : null}
          {lastResult?.within_geofence ? (
            <GeofenceEtaChip
              minutes={lastResult.approximate_eta_minutes}
              className="mt-2"
            />
          ) : null}
        </div>
      </div>

      <GeofencePrivacyOptIn
        arrivalLocationOptIn={arrivalLocationOptIn}
        locationDenied={locationDenied}
      />

      {proximityBanner ? (
        <GeofenceProximityBanner message={proximityBanner} />
      ) : null}
    </div>
  );
}
