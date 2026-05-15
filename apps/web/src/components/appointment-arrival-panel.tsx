"use client";

import { AppointmentQueueWaitCard } from "@/components/appointment-queue-wait-card";
import {
  CheckInArrivedWelcome,
  CheckInAutoAssist,
  CheckInInChair,
  CheckInLiveSyncStrip,
  CheckInProgressRail,
  CheckInQrFallback,
  CheckInStaffControls,
  CheckInStateAnnouncer,
  CheckInStatusHero,
  CheckInWaitingLounge,
} from "@/components/check-in";
import { GeofenceArrivalAssist } from "@/components/geofence";
import { useAppointmentQueueIntelligence } from "@/hooks/use-appointment-queue-intelligence";
import { useCheckInLiveSync } from "@/hooks/use-check-in-live-sync";
import { useGeofencedArrival } from "@/hooks/use-geofenced-arrival";
import {
  arrivalStateLabel,
  isAppointmentArrivalWindowOpen,
} from "@/lib/appointment-arrival";
import { hasShopCoordinates } from "@/lib/geofence-arrival";
import {
  fetchCustomerProfile,
  updateAppointmentArrival,
} from "@ozilcuts/api";
import type { AppointmentArrivalState, AppointmentRecord } from "@ozilcuts/types";
import { Surface, cn } from "@ozilcuts/ui";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AppointmentArrivalPanelProps = {
  appointment: AppointmentRecord;
  token: string;
  mode: "customer" | "staff";
  checkInAbsoluteUrl: string;
  onUpdated: (next: AppointmentRecord) => void;
  className?: string;
};

export function AppointmentArrivalPanel({
  appointment,
  token,
  mode,
  checkInAbsoluteUrl,
  onUpdated,
  className,
}: AppointmentArrivalPanelProps) {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrivalLocationOptIn, setArrivalLocationOptIn] = useState<
    boolean | null
  >(null);
  const [qrReady, setQrReady] = useState(false);

  const state = appointment.arrival_state;
  const windowOpen = useMemo(
    () => isAppointmentArrivalWindowOpen(appointment),
    [appointment],
  );

  const liveSyncEnabled =
    windowOpen && appointment.status === "confirmed";

  const { lastSyncedAt, syncing } = useCheckInLiveSync({
    token,
    appointment,
    enabled: liveSyncEnabled,
    onUpdated,
  });

  const queueIntelEnabled =
    liveSyncEnabled && state !== "in_chair";

  const {
    data: queueIntel,
    loading: queueIntelLoading,
    error: queueIntelError,
    lastSyncedAt: queueLastSyncedAt,
    syncing: queueSyncing,
  } = useAppointmentQueueIntelligence(
    queueIntelEnabled ? appointment.id : null,
    { enabled: queueIntelEnabled },
  );

  const geofenceEnabled =
    mode === "customer" &&
    appointment.status === "confirmed" &&
    state === "expected" &&
    windowOpen &&
    arrivalLocationOptIn === true &&
    hasShopCoordinates(appointment);

  const {
    proximityBanner,
    autoCheckInBusy,
    lastResult,
    locationDenied,
  } = useGeofencedArrival({
    token,
    appointment,
    enabled: geofenceEnabled,
    arrivalLocationOptIn,
    onAutoCheckIn: async () => {
      const row = await updateAppointmentArrival(token, appointment.id, {
        arrival_state: "arrived",
      });
      onUpdated(row);
      setError(null);
    },
    onOptOutDetected: () => setArrivalLocationOptIn(false),
  });

  const applyState = useCallback(
    async (next: AppointmentArrivalState) => {
      setError(null);
      setBusy(true);
      try {
        const row = await updateAppointmentArrival(token, appointment.id, {
          arrival_state: next,
        });
        onUpdated(row);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Could not update visit status.",
        );
      } finally {
        setBusy(false);
      }
    },
    [appointment.id, onUpdated, token],
  );

  useEffect(() => {
    if (mode !== "customer" || appointment.status !== "confirmed") {
      setArrivalLocationOptIn(null);
      return;
    }
    let cancelled = false;
    void fetchCustomerProfile(token)
      .then((p) => {
        if (!cancelled) setArrivalLocationOptIn(p.arrival_location_opt_in);
      })
      .catch(() => {
        if (!cancelled) setArrivalLocationOptIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, appointment.status, token]);

  useEffect(() => {
    if (!windowOpen || appointment.status !== "confirmed") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setQrReady(false);
    let cancelled = false;
    const isDark = resolvedTheme === "dark";
    void import("qrcode").then((QR) => {
      if (cancelled || !canvasRef.current) return;
      void QR.default.toCanvas(canvasRef.current, checkInAbsoluteUrl, {
        width: 216,
        margin: 2,
        color: {
          dark: isDark ? "#fafafa" : "#0c0c0c",
          light: isDark ? "#171717" : "#ffffff",
        },
      }).then(() => {
        if (!cancelled) setQrReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [appointment.status, checkInAbsoluteUrl, resolvedTheme, windowOpen]);

  if (appointment.status !== "confirmed") {
    return null;
  }

  const interactionLocked = busy || autoCheckInBusy;
  const headingId = `arrival-heading-${appointment.id}`;
  const customerExpected =
    windowOpen && mode === "customer" && state === "expected";

  return (
    <Surface
      elevation="quiet"
      padding="none"
      className={cn(
        "check-in-shell motion-safe:transition-shadow motion-safe:duration-300 motion-safe:ease-out",
        className,
      )}
      aria-labelledby={headingId}
    >
      <CheckInStateAnnouncer state={state} />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Visit status: {arrivalStateLabel(state)}.
      </div>

      <CheckInStatusHero
        state={state}
        mode={mode}
        windowOpen={windowOpen}
        barberName={appointment.barber?.name}
        headingId={headingId}
      />

      <div className="space-y-5 px-5 pb-6 sm:space-y-6 sm:px-7 sm:pb-7">
        <CheckInProgressRail state={state} />

        <CheckInLiveSyncStrip
          active={liveSyncEnabled}
          lastSyncedAt={lastSyncedAt}
          syncing={syncing}
        />

        {windowOpen &&
        state !== "in_chair" &&
        (mode === "staff" || state === "expected" || state === "arrived") ? (
          <AppointmentQueueWaitCard
            mode={mode}
            data={queueIntel}
            loading={queueIntelLoading}
            error={queueIntelError}
            lastSyncedAt={queueLastSyncedAt}
            syncing={queueSyncing}
            showLiveSync
          />
        ) : null}

        {error ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {!windowOpen ? (
          <p className="text-caption text-muted-foreground">
            Check-in unlocks within 36 hours of your start time and stays open
            until an hour after your booking ends.
          </p>
        ) : null}

        {windowOpen && mode === "staff" ? (
          <GeofenceArrivalAssist
            mode="staff"
            appointment={appointment}
            arrivalLocationOptIn={null}
            proximityBanner={null}
            autoCheckInBusy={false}
            lastResult={null}
          />
        ) : null}

        {windowOpen && mode === "customer" && state === "waiting" ? (
          <CheckInWaitingLounge
            queueData={queueIntel}
            queueLoading={queueIntelLoading}
          />
        ) : null}

        {windowOpen && mode === "customer" && state === "arrived" ? (
          <CheckInArrivedWelcome />
        ) : null}

        {windowOpen && mode === "customer" && state === "in_chair" ? (
          <CheckInInChair />
        ) : null}

        {windowOpen && mode === "staff" ? (
          <CheckInStaffControls
            state={state}
            busy={interactionLocked}
            onAdvance={(next) => void applyState(next)}
          />
        ) : null}

        {customerExpected ? (
          <div className="check-in-sticky-actions space-y-4 sm:space-y-5">
            <CheckInAutoAssist
              appointment={appointment}
              arrivalLocationOptIn={arrivalLocationOptIn}
              busy={busy}
              autoCheckInBusy={autoCheckInBusy}
              disabled={interactionLocked}
              onCheckIn={() => void applyState("arrived")}
            />
            <GeofenceArrivalAssist
              mode="customer"
              appointment={appointment}
              arrivalLocationOptIn={arrivalLocationOptIn}
              proximityBanner={proximityBanner}
              autoCheckInBusy={autoCheckInBusy}
              lastResult={lastResult}
              locationDenied={locationDenied}
            />
          </div>
        ) : null}

        {windowOpen ? (
          <CheckInQrFallback
            mode={mode}
            checkInAbsoluteUrl={checkInAbsoluteUrl}
            canvasRef={canvasRef}
            qrReady={qrReady}
            defaultOpen={mode === "staff" && state === "expected"}
            preferOpenOnMobile={customerExpected}
          />
        ) : null}
      </div>
    </Surface>
  );
}
