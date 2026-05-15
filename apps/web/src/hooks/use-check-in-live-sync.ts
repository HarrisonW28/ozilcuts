"use client";

import { CHECK_IN_LIVE_SYNC_POLL_MS } from "@/lib/check-in-flow";
import { fetchAppointment } from "@ozilcuts/api";
import type { AppointmentRecord } from "@ozilcuts/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseCheckInLiveSyncOptions = {
  token: string;
  appointment: AppointmentRecord;
  enabled: boolean;
  pollMs?: number;
  onUpdated: (row: AppointmentRecord) => void;
};

export function useCheckInLiveSync({
  token,
  appointment,
  enabled,
  pollMs = CHECK_IN_LIVE_SYNC_POLL_MS,
  onUpdated,
}: UseCheckInLiveSyncOptions) {
  const appointmentRef = useRef(appointment);
  appointmentRef.current = appointment;

  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncOnce = useCallback(async () => {
    if (!enabled) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    if (appointmentRef.current.status !== "confirmed") return;

    setSyncing(true);
    try {
      const row = await fetchAppointment(token, appointmentRef.current.id);
      const prev = appointmentRef.current;
      if (
        row.arrival_state !== prev.arrival_state ||
        row.starts_at !== prev.starts_at ||
        row.ends_at !== prev.ends_at ||
        row.status !== prev.status ||
        row.arrival_nearby_barber_notified_at !==
          prev.arrival_nearby_barber_notified_at
      ) {
        onUpdated(row);
      }
      setLastSyncedAt(Date.now());
    } catch {
      /* soft-fail */
    } finally {
      setSyncing(false);
    }
  }, [enabled, onUpdated, token]);

  useEffect(() => {
    if (!enabled) {
      setLastSyncedAt(null);
      setSyncing(false);
      return;
    }

    let cancelled = false;

    const tick = (): void => {
      if (cancelled) return;
      void syncOnce();
    };

    tick();
    const intervalId = window.setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, pollMs, syncOnce]);

  return { lastSyncedAt, syncing, refresh: syncOnce };
}
