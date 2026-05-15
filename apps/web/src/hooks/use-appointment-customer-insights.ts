"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { ApiError, fetchAppointmentCustomerInsights } from "@ozilcuts/api";
import type { AppointmentCustomerInsightsResponse } from "@ozilcuts/types";
import { useCallback, useEffect, useState } from "react";

export type UseAppointmentCustomerInsightsOptions = {
  enabled?: boolean;
};

export function useAppointmentCustomerInsights(
  appointmentId: number | null,
  options: UseAppointmentCustomerInsightsOptions = {},
) {
  const { enabled = true } = options;
  const [data, setData] = useState<AppointmentCustomerInsightsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnce = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token || appointmentId == null || !enabled) return;

    setLoading(true);
    try {
      const row = await fetchAppointmentCustomerInsights(token, appointmentId);
      setData(row);
      setError(null);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Could not load guest snapshot.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, enabled]);

  useEffect(() => {
    if (!enabled || appointmentId == null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void fetchOnce().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, enabled, fetchOnce]);

  return { data, loading, error, refresh: fetchOnce };
}
