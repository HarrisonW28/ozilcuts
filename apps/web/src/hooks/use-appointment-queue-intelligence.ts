"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { QUEUE_INTELLIGENCE_POLL_MS } from "@/lib/queue-intelligence";
import { ApiError, fetchAppointmentQueueIntelligence } from "@ozilcuts/api";
import type { AppointmentQueueIntelligenceResponse } from "@ozilcuts/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseAppointmentQueueIntelligenceOptions = {
  enabled?: boolean;
  pollMs?: number;
};

export function useAppointmentQueueIntelligence(
  appointmentId: number | null,
  options: UseAppointmentQueueIntelligenceOptions = {},
) {
  const { enabled = true, pollMs = QUEUE_INTELLIGENCE_POLL_MS } = options;
  const [data, setData] = useState<AppointmentQueueIntelligenceResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const hasDataRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token || appointmentId == null || !enabled) return;

    const softRefresh = hasDataRef.current;
    if (!softRefresh) {
      setLoading(true);
    } else {
      setSyncing(true);
    }

    try {
      const row = await fetchAppointmentQueueIntelligence(token, appointmentId);
      setData(row);
      setError(null);
      setLastSyncedAt(Date.now());
      hasDataRef.current = true;
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Queue insight is unavailable right now.";
      setError(msg);
      if (!hasDataRef.current) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [appointmentId, enabled]);

  useEffect(() => {
    if (!enabled || appointmentId == null) {
      setData(null);
      setError(null);
      setLoading(false);
      setLastSyncedAt(null);
      setSyncing(false);
      hasDataRef.current = false;
      return;
    }

    let cancelled = false;

    const tick = (): void => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void fetchOnce().then(() => {
        if (cancelled) return;
      });
    };

    tick();
    const id = window.setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [appointmentId, enabled, fetchOnce, pollMs]);

  return {
    data,
    loading,
    error,
    refresh: fetchOnce,
    lastSyncedAt,
    syncing,
  };
}
