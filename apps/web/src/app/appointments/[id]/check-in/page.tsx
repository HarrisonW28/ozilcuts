"use client";

import { AppointmentArrivalPanel } from "@/components/appointment-arrival-panel";
import { AppointmentContextThread } from "@/components/appointment-context-thread";
import { BarberReadinessPanel } from "@/components/barber-readiness-panel";
import { CheckInPageSkeleton } from "@/components/loading";
import { SiteHeader } from "@/components/site-header";
import { PAGE_DESCRIPTIONS } from "@/lib/user-facing-copy";
import { useShellPageChrome } from "@/lib/use-shell-page-chrome";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchAppointment } from "@ozilcuts/api";
import type { AppointmentRecord } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; appointment: AppointmentRecord }
  | { kind: "error"; message: string };

export default function AppointmentCheckInPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const rawId = params.id;
  const appointmentId =
    typeof rawId === "string"
      ? Number.parseInt(rawId, 10)
      : Array.isArray(rawId)
        ? Number.parseInt(rawId[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [checkInUrl, setCheckInUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(appointmentId) || appointmentId < 1) return;
    setCheckInUrl(
      `${window.location.origin}/appointments/${appointmentId}/check-in`,
    );
  }, [appointmentId]);

  const load = useCallback(() => {
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      setState({ kind: "error", message: "Invalid appointment link." });

      return;
    }
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in to continue." });

      return;
    }
    setState({ kind: "loading" });
    fetchAppointment(token, appointmentId)
      .then((row) => setState({ kind: "ok", appointment: row }))
      .catch((e: unknown) => {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to load appointment.";
        setState({ kind: "error", message });
      });
  }, [appointmentId]);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    load();
  }, [profile.kind, load]);

  useEffect(() => {
    if (profile.kind === "none") {
      router.replace(
        `/login?next=${encodeURIComponent(pathname || `/appointments/${appointmentId}/check-in`)}`,
      );
    }
  }, [profile.kind, router, pathname, appointmentId]);

  const appointment = state.kind === "ok" ? state.appointment : null;
  const isReady = profile.kind === "ready";
  const isCustomer =
    isReady && appointment !== null
      ? appointment.customer?.id === profile.user.id
      : false;
  const isAssignedBarber =
    isReady &&
    appointment !== null &&
    profile.user.role.slug === "barber" &&
    appointment.barber?.id === profile.user.id;
  const isAdmin = isReady && profile.user.role.slug === "admin";
  const isStaff =
    isReady && appointment !== null && (isAdmin || isAssignedBarber);
  const canUseVisitThread =
    isReady &&
    appointment !== null &&
    (isCustomer || isAssignedBarber || isAdmin);

  const token = getStoredAuthToken();

  const { inAppShell } = useShellPageChrome();

  return (
    <>
      {!inAppShell ? (
        <SiteHeader profile={profile} onSignOut={signOut} />
      ) : null}
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-lg page-stack">
          <ScreenTitle
            title="Check-in"
            description={PAGE_DESCRIPTIONS.checkIn}
          />

          {profile.kind === "loading" ? (
            <CheckInPageSkeleton className="max-w-none" />
          ) : null}

          {profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
          ) : null}

          {isReady && state.kind === "loading" ? (
            <CheckInPageSkeleton className="max-w-none" />
          ) : null}

          {isReady && state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn&rsquo;t open check-in</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/appointments">My appointments</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && appointment && token && checkInUrl ? (
            <AppointmentArrivalPanel
              appointment={appointment}
              token={token}
              mode={isCustomer ? "customer" : isStaff ? "staff" : "customer"}
              checkInAbsoluteUrl={checkInUrl}
              onUpdated={(row) => setState({ kind: "ok", appointment: row })}
              visitThreadAnchorId={
                canUseVisitThread ? "visit-thread" : undefined
              }
            />
          ) : null}

          {isReady && appointment && isStaff ? (
            <BarberReadinessPanel
              appointmentId={appointment.id}
              customerUserId={appointment.customer?.id ?? null}
              currentServiceId={appointment.service?.id ?? null}
              enabled
              className="mt-6"
            />
          ) : null}

          {isReady && canUseVisitThread && appointment && token ? (
            <div
              id="visit-thread"
              className="mt-8 scroll-mt-28 motion-safe:scroll-mt-24 md:scroll-mt-28"
            >
              <AppointmentContextThread
                appointmentId={appointment.id}
                token={token}
                viewerUserId={profile.user.id}
                isShopSide={isAssignedBarber || isAdmin}
                endsAt={appointment.ends_at}
              />
            </div>
          ) : null}

          {isReady && appointment ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href={`/appointments/${appointment.id}/confirmation`}
                className="underline-offset-4 hover:underline"
              >
                Full booking details
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
