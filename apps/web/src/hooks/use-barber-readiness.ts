"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import type { LoadSlice } from "@/lib/barber-readiness";
import {
  fetchAppointmentCustomerAiSummary,
  fetchAppointmentCustomerInsights,
  fetchAppointmentHairProfile,
  fetchAppointmentHaircutPhotos,
  fetchCustomerNotes,
} from "@ozilcuts/api";
import type {
  AppointmentCustomerAiSummaryResponse,
  AppointmentCustomerInsightsResponse,
  CustomerNote,
  HairProfilePhoto,
  HaircutPhoto,
} from "@ozilcuts/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export type UseBarberReadinessOptions = {
  appointmentId: number;
  customerUserId?: number | null;
  enabled: boolean;
};

export function useBarberReadiness({
  appointmentId,
  customerUserId,
  enabled,
}: UseBarberReadinessOptions) {
  const [insights, setInsights] = useState<
    LoadSlice<AppointmentCustomerInsightsResponse>
  >({ status: "idle" });
  const [hairProfile, setHairProfile] = useState<
    LoadSlice<{ photos: HairProfilePhoto[] }>
  >({ status: "idle" });
  const [visitPhotos, setVisitPhotos] = useState<LoadSlice<HaircutPhoto[]>>({
    status: "idle",
  });
  const [notes, setNotes] = useState<LoadSlice<CustomerNote[]>>({
    status: "idle",
  });
  const [aiSummary, setAiSummary] = useState<
    LoadSlice<AppointmentCustomerAiSummaryResponse>
  >({ status: "idle" });
  const [summaryReloadKey, setSummaryReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInsights({ status: "idle" });
      setHairProfile({ status: "idle" });
      setVisitPhotos({ status: "idle" });
      setNotes({ status: "idle" });
      return;
    }

    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      const msg = "Sign in required.";
      setInsights({ status: "error", message: msg });
      setHairProfile({ status: "error", message: msg });
      setVisitPhotos({ status: "error", message: msg });
      setNotes({ status: "error", message: msg });
      return;
    }

    setInsights({ status: "loading" });
    setHairProfile({ status: "loading" });
    setVisitPhotos({ status: "loading" });
    setNotes(
      customerUserId != null && customerUserId > 0
        ? { status: "loading" }
        : { status: "ok", data: [] },
    );

    const pInsights = fetchAppointmentCustomerInsights(token, appointmentId);
    const pProfile = fetchAppointmentHairProfile(token, appointmentId);
    const pPhotos = fetchAppointmentHaircutPhotos(token, appointmentId).then(
      (r) => r.data,
    );
    const pNotes =
      customerUserId != null && customerUserId > 0
        ? fetchCustomerNotes(token, customerUserId).then((r) => r.data)
        : Promise.resolve([] as CustomerNote[]);

    void Promise.allSettled([pInsights, pProfile, pPhotos, pNotes]).then(
      (outcomes) => {
        if (cancelled) return;
        const [oIn, oPr, oPh, oNo] = outcomes;

        if (oIn.status === "fulfilled") {
          setInsights({ status: "ok", data: oIn.value });
        } else {
          setInsights({ status: "error", message: "Could not load guest snapshot." });
        }

        if (oPr.status === "fulfilled") {
          setHairProfile({
            status: "ok",
            data: { photos: oPr.value.data?.photos ?? [] },
          });
        } else {
          setHairProfile({ status: "error", message: "Hair profile unavailable." });
        }

        if (oPh.status === "fulfilled") {
          setVisitPhotos({ status: "ok", data: oPh.value });
        } else {
          setVisitPhotos({ status: "error", message: "Visit photos unavailable." });
        }

        if (customerUserId != null && customerUserId > 0) {
          if (oNo.status === "fulfilled") {
            setNotes({ status: "ok", data: oNo.value });
          } else {
            setNotes({ status: "error", message: "Notes unavailable." });
          }
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [appointmentId, customerUserId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setAiSummary({ status: "idle" });
      return;
    }

    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      setAiSummary({ status: "error", message: "Sign in required." });
      return;
    }

    setAiSummary({ status: "loading" });
    fetchAppointmentCustomerAiSummary(token, appointmentId)
      .then((res) => {
        if (!cancelled) setAiSummary({ status: "ok", data: res });
      })
      .catch(() => {
        if (!cancelled) {
          setAiSummary({ status: "error", message: "Summary unavailable." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, enabled, summaryReloadKey]);

  const retryAiSummary = useCallback(() => {
    setSummaryReloadKey((k) => k + 1);
  }, []);

  const isInitialLoading = useMemo(() => {
    if (!enabled) return false;
    const notesLoading =
      Boolean(customerUserId && customerUserId > 0) &&
      (notes.status === "idle" || notes.status === "loading");
    return (
      insights.status === "idle" ||
      insights.status === "loading" ||
      hairProfile.status === "idle" ||
      hairProfile.status === "loading" ||
      visitPhotos.status === "idle" ||
      visitPhotos.status === "loading" ||
      notesLoading
    );
  }, [
    enabled,
    insights.status,
    hairProfile.status,
    visitPhotos.status,
    notes.status,
    customerUserId,
  ]);

  return {
    insights,
    hairProfile,
    visitPhotos,
    notes,
    aiSummary,
    isInitialLoading,
    retryAiSummary,
  };
}
