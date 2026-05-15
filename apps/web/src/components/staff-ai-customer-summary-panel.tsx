"use client";

import { ReadinessCustomerSummary } from "@/components/readiness/readiness-customer-summary";
import { getStoredAuthToken } from "@/lib/auth-token";
import { readinessConfirmationBase, type LoadSlice } from "@/lib/barber-readiness";
import { fetchAppointmentCustomerAiSummary } from "@ozilcuts/api";
import type { AppointmentCustomerAiSummaryResponse } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { useEffect, useState } from "react";

type StaffAiCustomerSummaryPanelProps = {
  appointmentId: number;
  enabled: boolean;
  className?: string;
};

/**
 * Staff-only narrative: haircut preferences, visit summaries, barber notes digest,
 * and operational insights. Generated server-side (rules or optional OpenAI); never calls models from the browser.
 */
export function StaffAiCustomerSummaryPanel({
  appointmentId,
  enabled,
  className,
}: StaffAiCustomerSummaryPanelProps) {
  const [slice, setSlice] = useState<LoadSlice<AppointmentCustomerAiSummaryResponse>>(() =>
    enabled ? { status: "loading" } : { status: "idle" },
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setSlice({ status: "idle" });
      return;
    }
    let cancelled = false;
    setSlice({ status: "loading" });
    const token = getStoredAuthToken();
    if (!token) {
      setSlice({ status: "error", message: "Sign in required." });
      return;
    }
    void fetchAppointmentCustomerAiSummary(token, appointmentId)
      .then((res) => {
        if (!cancelled) setSlice({ status: "ok", data: res });
      })
      .catch(() => {
        if (!cancelled) setSlice({ status: "error", message: "Could not load summary." });
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, enabled, reloadKey]);

  if (!enabled) return null;

  return (
    <ReadinessCustomerSummary
      slice={slice}
      confirmationHref={readinessConfirmationBase(appointmentId)}
      variant="expanded"
      onRetry={() => setReloadKey((k) => k + 1)}
      className={cn(className)}
    />
  );
}
