"use client";

import { DepositPayment } from "@/components/deposit-payment";
import { HaircutPhotosSection } from "@/components/haircut-photos-section";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchAppointment,
  fetchAppointmentCalendarLink,
  fetchAppointmentHairProfile,
  fetchAppointmentPaymentIntent,
} from "@ozilcuts/api";
import type {
  AppointmentPendingPayment,
  AppointmentRecord,
  HairProfile,
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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
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
      {label} · {formatUsd(depositCents)}
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
    if (profile.kind !== "ready") return;
    void load();
  }, [profile, load]);

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

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
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
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300"
              role="status"
            >
              {justBooked ? "Booking saved." : "Reschedule saved."}{" "}
              {appointment?.payment_status === "requires_payment"
                ? "Complete the deposit below to lock in your slot."
                : "We've sent a confirmation email."}
            </div>
          ) : null}

          {profile.kind === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
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
            <p className="text-sm text-muted-foreground" role="status">
              Loading booking…
            </p>
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
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {appointment.service?.name ?? "Service"}
                    </CardTitle>
                    <CardDescription>
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
              <CardContent className="space-y-3 text-sm">
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
                        {formatUsd(appointment.service.price_cents)}
                      </dd>
                    </div>
                  ) : null}
                  {appointment.deposit_cents > 0 ? (
                    <div>
                      <dt className="text-muted-foreground">Deposit</dt>
                      <dd className="font-medium">
                        {formatUsd(appointment.deposit_cents)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({PAYMENT_LABELS[appointment.payment_status].label})
                        </span>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {appointment.notes ? (
                  <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                    <span className="font-medium">Notes: </span>
                    {appointment.notes}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {calendarUrl ? (
                  <a
                    href={calendarUrl}
                    download
                    className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                  >
                    Add to calendar
                  </a>
                ) : null}
                <Button asChild variant="secondary" size="sm">
                  <Link href="/appointments">My appointments</Link>
                </Button>
                {appointment.status === "confirmed" && isCustomer ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/appointments/${appointment.id}/reschedule`}>
                      Reschedule
                    </Link>
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          ) : null}

          {isReady && appointment && isStaff ? (
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
          ) : null}

          {isReady && appointment ? (
            <HaircutPhotosSection
              appointmentId={appointment.id}
              viewerRole={isStaff ? "staff" : "customer"}
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
            <Card>
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
                  amountLabel={formatUsd(pending.deposit_cents)}
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
    </div>
  );
}
