"use client";

import { isAutoCheckInTimeWindow } from "@/lib/appointment-arrival";
import {
  formatAutoCheckInBanner,
  formatProximityBanner,
  GEOFENCE_PING_INTERVAL_MS,
  GEOFENCE_POSITION_OPTIONS,
  hasShopCoordinates,
  isGeolocationAvailable,
} from "@/lib/geofence-arrival";
import { ApiError, postAppointmentArrivalProximity } from "@ozilcuts/api";
import type {
  AppointmentArrivalProximityResponse,
  AppointmentRecord,
} from "@ozilcuts/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseGeofencedArrivalOptions = {
  token: string;
  appointment: AppointmentRecord;
  /** Customer with location opt-in, confirmed booking, expected state, window open. */
  enabled: boolean;
  arrivalLocationOptIn: boolean | null;
  onAutoCheckIn: () => Promise<void>;
  onOptOutDetected?: () => void;
};

export type GeofencedArrivalState = {
  proximityBanner: string | null;
  autoCheckInBusy: boolean;
  lastResult: AppointmentArrivalProximityResponse | null;
  locationDenied: boolean;
};

export function useGeofencedArrival({
  token,
  appointment,
  enabled,
  arrivalLocationOptIn,
  onAutoCheckIn,
  onOptOutDetected,
}: UseGeofencedArrivalOptions): GeofencedArrivalState {
  const [proximityBanner, setProximityBanner] = useState<string | null>(null);
  const [autoCheckInBusy, setAutoCheckInBusy] = useState(false);
  const [lastResult, setLastResult] =
    useState<AppointmentArrivalProximityResponse | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const appointmentRef = useRef(appointment);
  appointmentRef.current = appointment;
  const optInRef = useRef(arrivalLocationOptIn);
  optInRef.current = arrivalLocationOptIn;
  const autoInFlightRef = useRef(false);

  useEffect(() => {
    autoInFlightRef.current = false;
  }, [appointment.id]);

  useEffect(() => {
    if (!proximityBanner) return;
    const t = window.setTimeout(() => setProximityBanner(null), 12_000);
    return () => window.clearTimeout(t);
  }, [proximityBanner]);

  const handleProximityResult = useCallback(
    async (res: AppointmentArrivalProximityResponse) => {
      setLastResult(res);
      const cur = appointmentRef.current;

      if (
        res.within_geofence &&
        cur.arrival_state === "expected" &&
        cur.status === "confirmed" &&
        isAutoCheckInTimeWindow(cur) &&
        optInRef.current === true
      ) {
        if (autoInFlightRef.current) return;
        autoInFlightRef.current = true;
        setAutoCheckInBusy(true);
        try {
          await onAutoCheckIn();
          setProximityBanner(formatAutoCheckInBanner());
        } catch {
          autoInFlightRef.current = false;
        } finally {
          setAutoCheckInBusy(false);
        }
        return;
      }

      const banner = formatProximityBanner(res);
      if (banner) setProximityBanner(banner);
    },
    [onAutoCheckIn],
  );

  useEffect(() => {
    if (!enabled) return;
    if (arrivalLocationOptIn !== true) return;
    if (!hasShopCoordinates(appointment)) return;
    if (!isGeolocationAvailable()) return;

    const apptId = appointment.id;
    let cancelled = false;

    const ping = (): void => {
      if (cancelled) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          void postAppointmentArrivalProximity(token, apptId, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
            .then((res) => {
              if (cancelled) return;
              void handleProximityResult(res);
            })
            .catch((e: unknown) => {
              if (e instanceof ApiError && e.status === 403) {
                onOptOutDetected?.();
              }
            });
        },
        () => {
          if (!cancelled) setLocationDenied(true);
        },
        GEOFENCE_POSITION_OPTIONS,
      );
    };

    const onVis = (): void => {
      if (document.visibilityState === "visible") ping();
    };

    onVis();
    const intervalId = window.setInterval(onVis, GEOFENCE_PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    appointment,
    arrivalLocationOptIn,
    enabled,
    handleProximityResult,
    onOptOutDetected,
    token,
  ]);

  return {
    proximityBanner,
    autoCheckInBusy,
    lastResult,
    locationDenied,
  };
}
