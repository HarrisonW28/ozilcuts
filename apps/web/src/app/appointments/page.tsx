"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  cancelAppointment,
  fetchMyAppointments,
} from "@ozilcuts/api";
import type {
  AppointmentPaymentStatus,
  AppointmentRangeFilter,
  AppointmentRecord,
  AppointmentStatusFilter,
  Paginated,
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

function isPast(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
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
  const [state, setState] = useState<ListState>({ kind: "idle" });
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<AppointmentRangeFilter>("upcoming");
  const [status, setStatus] = useState<AppointmentStatusFilter>("confirmed");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-3xl space-y-8">
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
                <p className="text-sm text-muted-foreground" role="status">
                  Loading list…
                </p>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Nothing here</CardTitle>
                    <CardDescription>
                      No appointments match these filters.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild>
                      <Link href="/services">Browse services</Link>
                    </Button>
                  </CardFooter>
                </Card>
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

                    return (
                      <li key={row.id}>
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-base">
                                  {row.service?.name ?? "Service"}
                                </CardTitle>
                                <CardDescription>
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
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
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
                          <CardFooter className="flex flex-wrap gap-2">
                            {canMutate ? (
                              <>
                                <Button asChild size="sm" variant="secondary">
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
                                  disabled={isBusy}
                                  onClick={() => void onCancel(row)}
                                >
                                  {isBusy ? "Cancelling…" : "Cancel"}
                                </Button>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {row.status === "cancelled"
                                  ? "Cancelled — contact us if you'd like to rebook."
                                  : past
                                    ? "Past appointments are read-only."
                                    : "Read-only."}
                              </p>
                            )}
                          </CardFooter>
                        </Card>
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
