"use client";

import { AppointmentAdjustmentPanel } from "@/components/appointment-adjustment-panel";
import { AppointmentArrivalPanel } from "@/components/appointment-arrival-panel";
import { AppointmentContextThread } from "@/components/appointment-context-thread";
import { CustomerRelationshipCrmSection } from "@/components/customer-relationship";
import { DepositPayment } from "@/components/deposit-payment";
import { BookingConfirmationCardSkeleton } from "@/components/load-empty";
import { HaircutMemoryStaffNav } from "@/components/haircut-memory-staff-nav";
import { HaircutPhotosSection } from "@/components/haircut-photos-section";
import { HaircutShareCardLoader } from "@/components/social";
import { StaffAiCustomerSummaryPanel } from "@/components/staff-ai-customer-summary-panel";
import { StaffCustomerRecognitionPanel } from "@/components/staff-customer-recognition-panel";
import { SiteHeader } from "@/components/site-header";
import { buildBookFromRebookHint, buildBookHref } from "@/lib/booking-url";
import { useShellPageChrome } from "@/lib/use-shell-page-chrome";
import { StaffPosCheckoutCard } from "@/components/staff-pos-checkout-card";
import { getStoredAuthToken } from "@/lib/auth-token";
import { formatGbp } from "@/lib/format-gbp";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchAppointment,
  fetchAppointmentCalendarLink,
  fetchAppointmentHairProfile,
  fetchAppointmentPaymentIntent,
  fetchAppointmentRebookHint,
} from "@ozilcuts/api";
import type {
  AppointmentPendingPayment,
  AppointmentRecord,
  HairProfile,
  RebookSuggestion,
} from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; appointment: AppointmentRecord }
  | { kind: "error"; message: string };

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: AppointmentRecord["status"] }) {
  const styles =
    status === "confirmed"
      ? "border border-primary/30 bg-primary/10 text-primary"
      : "border border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        styles,
      )}
    >
      {status}
    </span>
  );
}

const PAYMENT_LABELS: Record<
  AppointmentRecord["payment_status"],
  { label: string; tone: string }
> = {
  not_required: {
    label: "No deposit",
    tone: "border border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  requires_payment: {
    label: "Deposit due",
    tone: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  processing: {
    label: "Processing",
    tone: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  paid: {
    label: "Deposit paid",
    tone: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  failed: {
    label: "Payment failed",
    tone: "border border-destructive/30 bg-destructive/10 text-destructive",
  },
  refunded: {
    label: "Refunded",
    tone: "border border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
};

function PaymentBadge({
  status,
  depositCents,
}: {
  status: AppointmentRecord["payment_status"];
  depositCents: number;
}) {
  if (status === "not_required" || depositCents === 0) return null;
  const { label, tone } = PAYMENT_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label} · {formatGbp(depositCents)}
    </span>
  );
}

export default function ConfirmationPage() {
  const params = useParams();
  const search = useSearchParams();
  const idParam = params.id;
  const appointmentId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const justBooked = search.get("just_booked") === "1";
  const justRescheduled = search.get("just_rescheduled") === "1";
  const fromThreadNotification = (() => {
    const t = search.get("thread");
    return t === "1" || t === "true";
  })();

  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<AppointmentPendingPayment | null>(
    null,
  );
  const [paymentDone, setPaymentDone] = useState(false);
  const [customerHairProfile, setCustomerHairProfile] =
    useState<HairProfile | null>(null);
  const [hairProfileError, setHairProfileError] = useState<string | null>(null);
  const [rebookHint, setRebookHint] = useState<RebookSuggestion | null>(null);
  const [rebookHintLoading, setRebookHintLoading] = useState(false);
  const [checkInAbsoluteUrl, setCheckInAbsoluteUrl] = useState("");

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      setState({ kind: "error", message: "Invalid confirmation link." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const appt = await fetchAppointment(token, appointmentId);
      setState({ kind: "ok", appointment: appt });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load appointment.";
      setState({ kind: "error", message });
    }
  }, [appointmentId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(appointmentId) || appointmentId < 1) return;
    setCheckInAbsoluteUrl(
      `${window.location.origin}/appointments/${appointmentId}/check-in`,
    );
  }, [appointmentId]);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    void load();
  }, [profile, load]);

  useEffect(() => {
    if (!fromThreadNotification) return;
    if (state.kind !== "ok") return;
    const tmr = window.setTimeout(() => {
      document.getElementById("visit-thread")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 280);
    return () => window.clearTimeout(tmr);
  }, [fromThreadNotification, state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.kind !== "ok") return;
    if (window.location.hash !== "#visit-wrap-up") return;
    const tmr = window.setTimeout(() => {
      document.getElementById("visit-wrap-up")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 320);
    return () => window.clearTimeout(tmr);
  }, [state]);

  useEffect(() => {
    if (state.kind !== "ok") return;
    const token = getStoredAuthToken();
    if (!token) return;
    fetchAppointmentCalendarLink(token, state.appointment.id)
      .then((res) => setCalendarUrl(res.url))
      .catch(() => setCalendarUrl(null));
  }, [state]);

  useEffect(() => {
    if (state.kind !== "ok") return;
    const appt = state.appointment;
    if (
      appt.payment_status !== "requires_payment" &&
      appt.payment_status !== "failed"
    ) {
      setPending(null);
      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;

    fetchAppointmentPaymentIntent(token, appt.id)
      .then(setPending)
      .catch(() => setPending(null));
  }, [state]);

  const isReady = profile.kind === "ready";
  const appointment = state.kind === "ok" ? state.appointment : null;
  const isCustomer =
    isReady && appointment !== null
      ? appointment.customer?.id === profile.user.id
      : false;
  const isAssignedBarber =
    isReady && appointment !== null
      ? appointment.barber?.id === profile.user.id
      : false;
  const isStaff =
    isReady &&
    (isAssignedBarber || profile.user.role.slug === "admin");
  const isAdmin = isReady && profile.user.role.slug === "admin";
  const canUseVisitThread =
    isReady &&
    appointment !== null &&
    (isCustomer || isAssignedBarber || isAdmin);
  const isPastAppointment =
    appointment !== null &&
    appointment.starts_at !== null &&
    !Number.isNaN(new Date(appointment.starts_at).getTime()) &&
    new Date(appointment.starts_at).getTime() < Date.now();
  const canRequestQuickMove =
    canUseVisitThread &&
    appointment !== null &&
    appointment.status === "confirmed" &&
    !isPastAppointment;
  const canSuggestRebook =
    isReady &&
    appointment !== null &&
    appointment.status === "confirmed" &&
    isPastAppointment &&
    (isCustomer || isAdmin);

  useEffect(() => {
    if (!canSuggestRebook || !appointment) {
      setRebookHint(null);
      setRebookHintLoading(false);
      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;

    let cancelled = false;
    setRebookHint(null);
    setRebookHintLoading(true);
    fetchAppointmentRebookHint(token, appointment.id)
      .then((res) => {
        if (cancelled) return;
        setRebookHint(res);
      })
      .catch(() => {
        if (cancelled) return;
        setRebookHint(null);
      })
      .finally(() => {
        if (cancelled) return;
        setRebookHintLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canSuggestRebook, appointment]);

  useEffect(() => {
    if (!isStaff || !appointment) {
      setCustomerHairProfile(null);
      setHairProfileError(null);

      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;

    let cancelled = false;
    setHairProfileError(null);
    fetchAppointmentHairProfile(token, appointment.id)
      .then((res) => {
        if (cancelled) return;
        setCustomerHairProfile(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCustomerHairProfile(null);
        setHairProfileError(
          err instanceof ApiError
            ? err.message
            : "Could not load the customer hair profile.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isStaff, appointment]);

  const { inAppShell } = useShellPageChrome();

  return (
    <>
      {!inAppShell ? (
        <SiteHeader profile={profile} onSignOut={signOut} />
      ) : null}
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-2xl page-stack">
          <ScreenTitle
            eyebrow={inAppShell ? undefined : OZILCUTS_APP_NAME}
            title={
              justBooked
                ? "You're booked in"
                : justRescheduled
                  ? "Time updated"
                  : "Booking details"
            }
            description={
              justBooked
                ? "Save the details below or add the appointment to your calendar."
                : justRescheduled
                  ? "We've shifted your appointment to the new time."
                  : "Everything we have on file for this booking."
            }
          />

          {(justBooked || justRescheduled) && state.kind === "ok" ? (
            <div
              className="motion-enter rounded-xl border border-emerald-500/35 bg-emerald-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200"
              role="status"
            >
              {justBooked ? "You're all set." : "Reschedule saved."}{" "}
              {appointment?.payment_status === "requires_payment"
                ? "Pay the deposit below to hold your spot."
                : "Check your email for the confirmation."}
            </div>
          ) : null}

          {profile.kind === "loading" ? (
            <div
              className="space-y-2"
              role="status"
              aria-busy="true"
              aria-label="Loading session"
            >
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-4 w-52 max-w-full rounded-md" />
            </div>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  You need to be signed in to view a booking confirmation.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && state.kind === "loading" ? (
            <BookingConfirmationCardSkeleton />
          ) : null}

          {isReady && state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn&rsquo;t load booking</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/appointments">My appointments</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && appointment ? (
            <Card className="border-border/55 shadow-md transition-shadow duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)] hover:shadow-md">
              <CardHeader className="space-y-1 border-b border-border/35 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {appointment.service?.name ?? "Service"}
                    </CardTitle>
                    <CardDescription className="text-base tabular-nums sm:text-lg">
                      {formatLong(appointment.starts_at)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={appointment.status} />
                    <PaymentBadge
                      status={appointment.payment_status}
                      depositCents={appointment.deposit_cents}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 text-sm">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {appointment.barber ? (
                    <div>
                      <dt className="text-muted-foreground">Barber</dt>
                      <dd className="font-medium">{appointment.barber.name}</dd>
                    </div>
                  ) : null}
                  {appointment.service ? (
                    <div>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-medium">
                        {appointment.service.duration_minutes} min
                      </dd>
                    </div>
                  ) : null}
                  {appointment.service ? (
                    <div>
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-medium">
                        {formatGbp(appointment.service.price_cents)}
                      </dd>
                    </div>
                  ) : null}
                  {appointment.deposit_cents > 0 ? (
                    <div>
                      <dt className="text-muted-foreground">Deposit</dt>
                      <dd className="font-medium">
                        {formatGbp(appointment.deposit_cents)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({PAYMENT_LABELS[appointment.payment_status].label})
                        </span>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {appointment.notes && !isStaff ? (
                  <p className="whitespace-pre-wrap rounded-xl border border-border/40 bg-muted/35 p-4 text-sm leading-relaxed">
                    <span className="font-semibold text-foreground">Notes </span>
                    <span className="text-muted-foreground">· </span>
                    {appointment.notes}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t border-border/35 pt-4">
                {calendarUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                  >
                    <a href={calendarUrl} download>
                      Add to calendar
                    </a>
                  </Button>
                ) : null}
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="min-h-11 touch-manipulation sm:min-h-9"
                >
                  <Link href="/appointments">My appointments</Link>
                </Button>
                {appointment.status === "confirmed" && !isPastAppointment ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                  >
                    <Link href={`/appointments/${appointment.id}/check-in`}>
                      Check-in page
                    </Link>
                  </Button>
                ) : null}
                {appointment.status === "confirmed" &&
                isCustomer &&
                !isPastAppointment ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                  >
                    <Link href={`/appointments/${appointment.id}/reschedule`}>
                      Reschedule
                    </Link>
                  </Button>
                ) : null}
                {canSuggestRebook && rebookHintLoading ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="min-h-11 touch-manipulation sm:min-h-9"
                    aria-busy="true"
                    aria-live="polite"
                  >
                    Finding your usual slot…
                  </Button>
                ) : null}
                {canSuggestRebook && !rebookHintLoading && rebookHint ? (
                  <Button
                    asChild
                    size="sm"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                  >
                    <Link href={buildBookFromRebookHint(rebookHint)}>
                      Book this again
                      <span className="ml-1 text-xs font-normal opacity-80">
                        · suggested {formatIsoDate(rebookHint.suggested_date)}
                      </span>
                    </Link>
                  </Button>
                ) : null}
                {canSuggestRebook &&
                !rebookHintLoading &&
                !rebookHint &&
                appointment.service &&
                appointment.barber ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                  >
                    <Link
                      href={buildBookHref({
                        serviceId: appointment.service.id,
                        barberUserId: appointment.barber.id,
                        express: true,
                      })}
                    >
                      Book this again
                    </Link>
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          ) : null}

          {canUseVisitThread && appointment ? (
            (() => {
              const token = getStoredAuthToken();
              if (!token) return null;

              return (
                <div className="mt-5 md:mt-6 space-y-5">
                  <AppointmentAdjustmentPanel
                    appointment={appointment}
                    token={token}
                    canRequest={canRequestQuickMove}
                    rescheduleHref={`/appointments/${appointment.id}/reschedule`}
                    onAppointmentUpdated={(row) =>
                      setState({ kind: "ok", appointment: row })
                    }
                  />
                  <div
                    id="visit-thread"
                    className="scroll-mt-28 motion-safe:scroll-mt-24 md:scroll-mt-28"
                  >
                    <AppointmentContextThread
                      appointmentId={appointment.id}
                      token={token}
                      viewerUserId={profile.user.id}
                      isShopSide={isAssignedBarber || isAdmin}
                      endsAt={appointment.ends_at}
                    />
                  </div>
                </div>
              );
            })()
          ) : null}

          {isReady &&
          appointment &&
          appointment.status === "confirmed" &&
          !isPastAppointment &&
          checkInAbsoluteUrl ? (
            (() => {
              const token = getStoredAuthToken();
              if (!token) return null;

              return (
                <AppointmentArrivalPanel
                  appointment={appointment}
                  token={token}
                  mode={isCustomer ? "customer" : isStaff ? "staff" : "customer"}
                  checkInAbsoluteUrl={checkInAbsoluteUrl}
                  onUpdated={(row) => setState({ kind: "ok", appointment: row })}
                />
              );
            })()
          ) : null}

          {isReady && appointment && isStaff ? (
            <div
              id="visit-wrap-up"
              className="scroll-mt-28 motion-safe:scroll-mt-24 md:scroll-mt-28"
            >
              <StaffPosCheckoutCard
                appointment={appointment}
                confirmationPath={`/appointments/${appointment.id}/confirmation`}
              />
            </div>
          ) : null}

          {isReady && appointment && isStaff ? (
            <StaffCustomerRecognitionPanel
              appointmentId={appointment.id}
              currentServiceId={appointment.service?.id ?? null}
              enabled
            />
          ) : null}

          {isReady && appointment && isStaff ? (
            <StaffAiCustomerSummaryPanel appointmentId={appointment.id} enabled className="mt-6" />
          ) : null}

          {isReady && appointment && isStaff ? (
            <Card className="border-primary/30 bg-primary/[0.04] shadow-sm dark:border-primary/25 dark:bg-primary/[0.06]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Haircut memory</CardTitle>
                <CardDescription>
                  Barber-facing context for this visit: jump to booking notes,
                  saved hair profile, photos, and your internal notes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HaircutMemoryStaffNav
                  showBookingNotes={Boolean(
                    appointment.notes && appointment.notes.trim().length > 0,
                  )}
                />
              </CardContent>
            </Card>
          ) : null}

          {isReady && appointment && isStaff && appointment.notes ? (
            <div id="memory-booking-notes" className="scroll-mt-28">
              <Card className="border-border/55 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Customer booking note</CardTitle>
                  <CardDescription>
                    From the booking flow — what they asked for this visit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap rounded-xl border border-border/35 bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                    {appointment.notes}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {isReady && appointment && isStaff ? (
            <div id="memory-hair-profile" className="scroll-mt-28">
              <Card>
              <CardHeader>
                <CardTitle>Customer hair profile</CardTitle>
                <CardDescription>
                  {appointment.customer?.name
                    ? `${appointment.customer.name}'s preferences and reference photos.`
                    : "Customer preferences and reference photos."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {hairProfileError ? (
                  <p className="text-destructive" role="alert">
                    {hairProfileError}
                  </p>
                ) : null}
                {!hairProfileError && customerHairProfile === null ? (
                  <p className="text-muted-foreground">
                    The customer hasn&rsquo;t filled in a hair profile yet.
                  </p>
                ) : null}
                {customerHairProfile ? (
                  <>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium capitalize">
                          {customerHairProfile.hair_type ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Thickness</dt>
                        <dd className="font-medium capitalize">
                          {customerHairProfile.hair_thickness ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Length</dt>
                        <dd className="font-medium capitalize">
                          {customerHairProfile.hair_length
                            ? customerHairProfile.hair_length.replace(/_/g, " ")
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Scalp</dt>
                        <dd className="font-medium capitalize">
                          {customerHairProfile.scalp_condition ?? "—"}
                        </dd>
                      </div>
                    </dl>
                    {customerHairProfile.preferred_clipper_guard ? (
                      <p>
                        <span className="font-medium">Clipper guard: </span>
                        {customerHairProfile.preferred_clipper_guard}
                      </p>
                    ) : null}
                    {customerHairProfile.allergies ? (
                      <p>
                        <span className="font-medium">Allergies: </span>
                        {customerHairProfile.allergies}
                      </p>
                    ) : null}
                    {customerHairProfile.styling_notes ? (
                      <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3">
                        <span className="font-medium">Notes: </span>
                        {customerHairProfile.styling_notes}
                      </p>
                    ) : null}
                    {customerHairProfile.photos.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {customerHairProfile.photos.map((photo) => (
                          <li key={photo.id} className="space-y-1">
                            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.caption ?? "Hair reference"}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            {photo.caption ? (
                              <p className="text-xs text-muted-foreground">
                                {photo.caption}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
            </div>
          ) : null}

          {isReady && appointment ? (
            <div
              id={isStaff ? "memory-visit-photos" : undefined}
              className={isStaff ? "scroll-mt-28" : undefined}
            >
              <HaircutPhotosSection
                appointmentId={appointment.id}
                viewerRole={isStaff ? "staff" : "customer"}
              />
            </div>
          ) : null}

          {isReady &&
          appointment &&
          isCustomer &&
          appointment.status === "confirmed" &&
          appointment.barber ? (
            <HaircutShareCardLoader
              className="mt-6"
              appointmentId={appointment.id}
              barberName={appointment.barber.name}
              serviceName={appointment.service?.name}
              visitDateIso={appointment.starts_at}
              barberUserId={appointment.barber.id}
            />
          ) : null}

          {isReady && appointment && isStaff && appointment.customer ? (
            <CustomerRelationshipCrmSection
              customerUserId={appointment.customer.id}
              customerName={appointment.customer.name}
              currentUserId={profile.user.id}
              isAdmin={profile.user.role.slug === "admin"}
            />
          ) : null}

          {isReady &&
          appointment &&
          isCustomer &&
          !paymentDone &&
          appointment.payment_status === "requires_payment" &&
          pending &&
          pending.enabled &&
          pending.client_secret &&
          pending.publishable_key ? (
            <Card className="border-primary/25 shadow-md ring-1 ring-primary/10 dark:border-primary/30 dark:ring-primary/15">
              <CardHeader>
                <CardTitle>Pay deposit</CardTitle>
                <CardDescription>
                  Your slot is held. Complete the deposit to lock it in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DepositPayment
                  clientSecret={pending.client_secret}
                  publishableKey={pending.publishable_key}
                  amountLabel={formatGbp(pending.deposit_cents)}
                  onSucceeded={() => {
                    setPaymentDone(true);
                    void load();
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          {isReady &&
          appointment &&
          appointment.payment_status === "requires_payment" &&
          pending &&
          !pending.enabled ? (
            <p
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300"
              role="status"
            >
              Online payments aren&rsquo;t configured yet — please pay your
              deposit in person at the shop.
            </p>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
