"use client";

import { SiteHeader } from "@/components/site-header";
import { AppointmentListSkeleton } from "@/components/load-empty";
import { SwipeRevealActions } from "@/components/swipe-reveal-actions";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useMediaQuery } from "@/lib/use-media-query";
import { useSessionProfile } from "@/lib/use-session-profile";
import type { ProfileState } from "@/lib/use-session-profile";
import {
  ApiError,
  cancelAppointment,
  fetchMyAppointments,
  fetchNextVisitSuggestion,
  sendAppointmentReminder,
  sendAppointmentRunningLate,
} from "@ozilcuts/api";
import type {
  AppointmentPaymentStatus,
  AppointmentRangeFilter,
  AppointmentRecord,
  AppointmentStatusFilter,
  Paginated,
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
  cn,
  EmptyState,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; page: Paginated<AppointmentRecord> }
  | { kind: "error"; message: string };

const RANGE_OPTIONS: Array<{ value: AppointmentRangeFilter; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

const STATUS_OPTIONS: Array<{
  value: AppointmentStatusFilter;
  label: string;
}> = [
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "Any status" },
];

function formatStart(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function buildBookAgainFromRowHref(row: AppointmentRecord): string | null {
  if (!row.service || !row.barber) return null;
  const params = new URLSearchParams({
    service: String(row.service.id),
    barber: String(row.barber.id),
  });
  return `/book?${params.toString()}`;
}

function buildBookAgainFromHintHref(hint: RebookSuggestion): string {
  const params = new URLSearchParams({
    service: String(hint.service_id),
    barber: String(hint.barber_user_id),
    date: hint.suggested_date,
  });
  return `/book?${params.toString()}`;
}

function isPast(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function canSendRunningLateNotice(
  row: AppointmentRecord,
  profile: ProfileState,
): boolean {
  if (row.status !== "confirmed" || !row.ends_at) return false;
  const endMs = new Date(row.ends_at).getTime();
  if (Number.isNaN(endMs) || endMs <= Date.now()) return false;
  if (profile.kind !== "ready") return false;
  if (profile.user.role.slug === "admin") return true;
  if (
    profile.user.role.slug === "barber" &&
    row.barber?.id === profile.user.id
  ) {
    return true;
  }
  return false;
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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const PAYMENT_LABELS: Record<AppointmentPaymentStatus, string> = {
  not_required: "No deposit",
  requires_payment: "Deposit due",
  processing: "Processing",
  paid: "Deposit paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

function PaymentBadge({
  status,
  depositCents,
}: {
  status: AppointmentPaymentStatus;
  depositCents: number;
}) {
  if (status === "not_required" || depositCents === 0) return null;

  const styles =
    status === "paid"
      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "refunded"
        ? "border border-muted-foreground/30 bg-muted/40 text-muted-foreground"
        : status === "failed"
          ? "border border-destructive/30 bg-destructive/10 text-destructive"
          : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles,
      )}
    >
      {PAYMENT_LABELS[status]} · {formatUsd(depositCents)}
    </span>
  );
}

export default function AppointmentsPage() {
  const { profile, signOut } = useSessionProfile();
  const isMaxMd = useMediaQuery("(max-width: 767px)");
  const [state, setState] = useState<ListState>({ kind: "idle" });
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<AppointmentRangeFilter>("upcoming");
  const [status, setStatus] = useState<AppointmentStatusFilter>("confirmed");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reminderBusyId, setReminderBusyId] = useState<number | null>(null);
  const [reminderSentForId, setReminderSentForId] = useState<number | null>(
    null,
  );
  const [lateBusyId, setLateBusyId] = useState<number | null>(null);
  const [lateSentForId, setLateSentForId] = useState<number | null>(null);
  const [nextVisit, setNextVisit] = useState<RebookSuggestion | null>(null);
  const [nextVisitDismissed, setNextVisitDismissed] = useState(false);

  const load = useCallback(
    async (
      p: number,
      r: AppointmentRangeFilter,
      s: AppointmentStatusFilter,
    ) => {
      const token = getStoredAuthToken();
      if (!token) {
        setState({ kind: "error", message: "Sign in required." });

        return;
      }
      setState({ kind: "loading" });
      try {
        const data = await fetchMyAppointments(token, {
          page: p,
          range: r,
          status: s,
        });
        setState({ kind: "ok", page: data });
      } catch (e: unknown) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to load appointments.";
        setState({ kind: "error", message });
      }
    },
    [],
  );

  useEffect(() => {
    if (profile.kind !== "ready") return;
    void load(page, range, status);
  }, [profile, page, range, status, load]);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    if (profile.user.role.slug !== "customer") {
      setNextVisit(null);
      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;

    let cancelled = false;
    fetchNextVisitSuggestion(token)
      .then((res) => {
        if (cancelled) return;
        setNextVisit(res);
      })
      .catch(() => {
        if (cancelled) return;
        setNextVisit(null);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  function changeRange(next: AppointmentRangeFilter) {
    setRange(next);
    setPage(1);
  }

  function changeStatus(next: AppointmentStatusFilter) {
    setStatus(next);
    setPage(1);
  }

  async function onCancel(row: AppointmentRecord) {
    const ok = window.confirm(
      `Cancel ${row.service?.name ?? "this appointment"} on ${formatStart(row.starts_at)}?`,
    );
    if (!ok) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setActionBusyId(row.id);
    setActionError(null);
    try {
      await cancelAppointment(token, row.id);
      await load(page, range, status);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not cancel. Please try again.",
      );
    } finally {
      setActionBusyId(null);
    }
  }

  async function onSendReminder(row: AppointmentRecord) {
    const ok = window.confirm(
      `Send a reminder for ${row.customer?.name ?? "this customer"}'s booking on ${formatStart(row.starts_at)}?`,
    );
    if (!ok) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setReminderBusyId(row.id);
    setActionError(null);
    setReminderSentForId(null);
    try {
      await sendAppointmentReminder(token, row.id);
      setReminderSentForId(row.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not send reminder. Please try again.",
      );
    } finally {
      setReminderBusyId(null);
    }
  }

  async function onRunningLate(row: AppointmentRecord, lateByMinutes: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    setLateBusyId(row.id);
    setActionError(null);
    setLateSentForId(null);
    try {
      await sendAppointmentRunningLate(token, row.id, lateByMinutes);
      setLateSentForId(row.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not send notice. Please try again.",
      );
    } finally {
      setLateBusyId(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="My appointments"
            description="Customers see their bookings; barbers see incoming bookings; admins see everything."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Create an account or sign in to view your appointments.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create account</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" &&
          profile.user.role.slug === "customer" &&
          nextVisit &&
          !nextVisitDismissed ? (
            <Card className="border-primary/35 bg-primary/5 shadow-sm dark:border-primary/30">
              <CardHeader className="space-y-2 pb-2 sm:pb-3">
                <CardTitle className="text-lg tracking-tight sm:text-xl">
                  Time for your next visit?
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {nextVisit.barber && nextVisit.service
                    ? `Based on your visits with ${nextVisit.barber.name}, you usually book ${nextVisit.service.name} every ${nextVisit.interval_days} days. Suggested for ${formatIsoDate(nextVisit.suggested_date)}.`
                    : `Suggested for ${formatIsoDate(nextVisit.suggested_date)}.`}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2 border-t border-border/30 pt-4">
                <Button
                  asChild
                  size="sm"
                  className="min-h-11 touch-manipulation sm:min-h-9"
                >
                  <Link href={buildBookAgainFromHintHref(nextVisit)}>
                    Book it
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11 touch-manipulation sm:min-h-9"
                  onClick={() => setNextVisitDismissed(true)}
                >
                  Not now
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" ? (
            <>
              <div
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
                aria-label="Appointment filters"
              >
                <div
                  role="radiogroup"
                  aria-label="Time range"
                  className="flex flex-wrap gap-2"
                >
                  {RANGE_OPTIONS.map((opt) => {
                    const checked = range === opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => changeRange(opt.value)}
                        className={cn(
                          "min-h-11 rounded-md border px-3 text-sm sm:min-h-9",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted/60",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div
                  role="radiogroup"
                  aria-label="Status"
                  className="flex flex-wrap gap-2"
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const checked = status === opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => changeStatus(opt.value)}
                        className={cn(
                          "min-h-11 rounded-md border px-3 text-sm sm:min-h-9",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted/60",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {actionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}

              {state.kind === "loading" || state.kind === "idle" ? (
                <AppointmentListSkeleton rows={3} />
              ) : null}
              {state.kind === "error" ? (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
                  <p className="text-sm text-destructive">{state.message}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => void load(page, range, status)}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              {state.kind === "ok" && state.page.data.length === 0 ? (
                <EmptyState
                  title="Nothing here"
                  description="No appointments match these filters."
                  action={
                    <Button asChild>
                      <Link href="/services">Browse services</Link>
                    </Button>
                  }
                />
              ) : null}
              {state.kind === "ok" && state.page.data.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {state.page.data.map((row) => {
                    const past = isPast(row.starts_at);
                    const canMutate =
                      row.status === "confirmed" &&
                      !past &&
                      profile.kind === "ready";
                    const isBusy = actionBusyId === row.id;
                    const isCustomer =
                      profile.kind === "ready" &&
                      profile.user.role.slug === "customer" &&
                      row.customer?.id === profile.user.id;
                    const canSendReminder =
                      row.status === "confirmed" &&
                      !past &&
                      profile.kind === "ready" &&
                      (profile.user.role.slug === "admin" ||
                        (profile.user.role.slug === "barber" &&
                          row.barber?.id === profile.user.id));
                    const canNotifyRunningLate = canSendRunningLateNotice(
                      row,
                      profile,
                    );
                    const reminderBusy = reminderBusyId === row.id;
                    const reminderSent = reminderSentForId === row.id;
                    const lateBusy = lateBusyId === row.id;
                    const lateSent = lateSentForId === row.id;
                    const bookAgainHref =
                      isCustomer &&
                      row.status === "confirmed" &&
                      past
                        ? buildBookAgainFromRowHref(row)
                        : null;

                    const swipeEnabled =
                      isMaxMd
                      && (canMutate || canSendReminder || !!bookAgainHref);

                    const appointmentCard = (
                      <Card
                        className={cn(
                          "border-border/55 shadow-sm transition-[box-shadow,transform] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)] hover:shadow-md motion-safe:hover:-translate-y-px",
                          swipeEnabled
                            ? "border-0 shadow-none ring-0"
                            : null,
                        )}
                      >
                          <CardHeader className="space-y-1 pb-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <CardTitle className="text-lg font-semibold tracking-tight">
                                  {row.service?.name ?? "Service"}
                                </CardTitle>
                                <CardDescription className="text-sm tabular-nums text-muted-foreground">
                                  {formatStart(row.starts_at)}
                                </CardDescription>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={row.status} />
                                <PaymentBadge
                                  status={row.payment_status}
                                  depositCents={row.deposit_cents}
                                />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 border-t border-border/40 pt-3 text-sm text-muted-foreground">
                            {row.barber ? (
                              <p>
                                <span className="font-medium text-foreground">
                                  Barber:{" "}
                                </span>
                                {row.barber.name}
                              </p>
                            ) : null}
                            {row.customer ? (
                              <p>
                                <span className="font-medium text-foreground">
                                  Customer:{" "}
                                </span>
                                {row.customer.name}
                              </p>
                            ) : null}
                            {row.notes ? (
                              <p className="whitespace-pre-wrap">
                                <span className="font-medium text-foreground">
                                  Notes:{" "}
                                </span>
                                {row.notes}
                              </p>
                            ) : null}
                          </CardContent>
                          <CardFooter className="flex flex-wrap gap-2 border-t border-border/35 pt-4">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="min-h-11 touch-manipulation sm:min-h-9"
                            >
                              <Link
                                href={`/appointments/${row.id}/confirmation`}
                              >
                                View
                              </Link>
                            </Button>
                            {canMutate ? (
                              <>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="secondary"
                                  className="min-h-11 touch-manipulation sm:min-h-9"
                                >
                                  <Link
                                    href={`/appointments/${row.id}/reschedule`}
                                  >
                                    Reschedule
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="min-h-11 touch-manipulation sm:min-h-9"
                                  disabled={isBusy}
                                  onClick={() => void onCancel(row)}
                                >
                                  {isBusy ? "Cancelling…" : "Cancel"}
                                </Button>
                              </>
                            ) : null}
                            {canSendReminder ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-11 touch-manipulation sm:min-h-9"
                                disabled={reminderBusy}
                                onClick={() => void onSendReminder(row)}
                                aria-live="polite"
                              >
                                {reminderBusy
                                  ? "Sending…"
                                  : reminderSent
                                    ? "Reminder sent"
                                    : "Send reminder"}
                              </Button>
                            ) : null}
                            {canNotifyRunningLate ? (
                              <div className="w-full basis-full border-t border-border/30 pt-3">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Running behind? Notify the customer (email
                                  + inbox).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {[10, 15, 20].map((m) => (
                                    <Button
                                      key={m}
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="min-h-11 touch-manipulation sm:min-h-9"
                                      disabled={lateBusy}
                                      onClick={() => void onRunningLate(row, m)}
                                    >
                                      {lateBusy
                                        ? "Sending…"
                                        : `+${m} min late`}
                                    </Button>
                                  ))}
                                </div>
                                {lateSent ? (
                                  <p
                                    className="mt-2 text-xs font-medium text-primary"
                                    role="status"
                                  >
                                    Customer notified.
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            {bookAgainHref ? (
                              <Button
                                asChild
                                size="sm"
                                variant="secondary"
                                className="min-h-11 touch-manipulation sm:min-h-9"
                              >
                                <Link href={bookAgainHref}>Book again</Link>
                              </Button>
                            ) : null}
                            {!canMutate &&
                            !bookAgainHref &&
                            !canSendReminder &&
                            !canNotifyRunningLate ? (
                              <p className="text-xs text-muted-foreground">
                                {row.status === "cancelled"
                                  ? "Cancelled — contact us if you'd like to rebook."
                                  : past
                                    ? "Past appointments are read-only."
                                    : "Read-only."}
                              </p>
                            ) : null}
                          </CardFooter>
                        </Card>
                    );

                    return (
                      <li key={row.id}>
                        <SwipeRevealActions
                          enabled={swipeEnabled}
                          actionsWidth={96}
                          className="md:shadow-none md:ring-0"
                          actions={
                            <div className="flex h-full min-h-0 flex-col">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="min-h-12 flex-1 rounded-none border-0 border-b border-border/50 px-1 text-xs font-medium leading-tight"
                              >
                                <Link
                                  href={`/appointments/${row.id}/confirmation`}
                                >
                                  View
                                </Link>
                              </Button>
                              {canMutate ? (
                                <Button
                                  asChild
                                  variant="secondary"
                                  size="sm"
                                  className="min-h-12 flex-1 rounded-none border-0 border-b border-border/50 px-1 text-xs font-medium leading-tight"
                                >
                                  <Link
                                    href={`/appointments/${row.id}/reschedule`}
                                  >
                                    Reschedule
                                  </Link>
                                </Button>
                              ) : null}
                              {canSendReminder ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="min-h-12 flex-1 rounded-none border-0 border-b border-border/50 px-1 text-xs font-medium leading-tight"
                                  disabled={reminderBusy}
                                  onClick={() => void onSendReminder(row)}
                                >
                                  {reminderBusy
                                    ? "…"
                                    : reminderSent
                                      ? "Sent"
                                      : "Remind"}
                                </Button>
                              ) : null}
                              {bookAgainHref ? (
                                <Button
                                  asChild
                                  variant="secondary"
                                  size="sm"
                                  className="min-h-12 flex-1 rounded-none border-0 border-b border-border/50 px-1 text-xs font-medium leading-tight"
                                >
                                  <Link href={bookAgainHref}>Again</Link>
                                </Button>
                              ) : null}
                              {canMutate ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="min-h-12 flex-1 rounded-none border-0 bg-destructive/15 px-1 text-xs font-semibold leading-tight text-destructive hover:bg-destructive/25"
                                  disabled={isBusy}
                                  onClick={() => void onCancel(row)}
                                >
                                  {isBusy ? "…" : "Cancel"}
                                </Button>
                              ) : null}
                            </div>
                          }
                        >
                          {appointmentCard}
                        </SwipeRevealActions>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {state.kind === "ok" && state.page.meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {state.page.meta.current_page} of{" "}
                    {state.page.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={state.page.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        state.page.meta.current_page >=
                        state.page.meta.last_page
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
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
