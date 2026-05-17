"use client";

import { SiteHeader } from "@/components/site-header";
import { PageSessionSkeleton } from "@/components/loading";
import { getStoredAuthToken } from "@/lib/auth-token";
import { formatGbp } from "@/lib/format-gbp";
import {
  reportFilterActionButtonClass,
  reportFilterActionsClass,
  reportFilterControlClass,
  reportFilterFieldCellClass,
  reportFilterPresetButtonClass,
  reportFilterPresetsGridClass,
  reportFilterTwoColGridClass,
} from "@/lib/report-filter-classes";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchBarberAnalyticsCompare,
} from "@ozilcuts/api";
import type { BarberAnalyticsCompareResponse } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  Label,
  ScreenTitle,
  TableSkeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CompareState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: BarberAnalyticsCompareResponse }
  | { kind: "error"; message: string };

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function isoOffsetDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AdminBarberComparePage() {
  const { profile, signOut } = useSessionProfile();
  const [from, setFrom] = useState<string>(startOfMonthIso());
  const [to, setTo] = useState<string>(todayIso());
  const [state, setState] = useState<CompareState>({ kind: "idle" });

  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchBarberAnalyticsCompare(token, { from, to });
      setState({ kind: "ok", data });
    } catch (err: unknown) {
      const message =
        err instanceof ApiValidationError
          ? (err.firstMessage() ?? "Invalid filters.")
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load report.";
      setState({ kind: "error", message });
    }
  }, [from, to]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  function applyPreset(preset: "this_month" | "last_30" | "last_90" | "ytd") {
    if (preset === "this_month") {
      setFrom(startOfMonthIso());
      setTo(todayIso());
    } else if (preset === "last_30") {
      setFrom(isoOffsetDays(-29));
      setTo(todayIso());
    } else if (preset === "last_90") {
      setFrom(isoOffsetDays(-89));
      setTo(todayIso());
    } else if (preset === "ytd") {
      const year = new Date().getFullYear();
      setFrom(`${year}-01-01`);
      setTo(todayIso());
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-6xl page-stack">
          <ScreenTitle
            title="Barber compare"
            description="How each chair did this period — bookings and revenue side by side."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <PageSessionSkeleton statusLabel="Loading" />
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  This page is admin-only. Please sign in.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" && !isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admins only</CardTitle>
                <CardDescription>
                  This page is restricted to admin accounts.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isAdmin ? (
            <>
              <Card size="sm" className="dashboard-surface">
                <CardHeader>
                  <CardTitle className="text-base">Date range</CardTitle>
                  <CardDescription>
                    Rankings use appointments starting in this window.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      void load();
                    }}
                  >
                    <div className={reportFilterTwoColGridClass}>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="bc-from">From</Label>
                        <input
                          id="bc-from"
                          type="date"
                          value={from}
                          max={to}
                          onChange={(ev) => setFrom(ev.target.value)}
                          className={reportFilterControlClass}
                          required
                        />
                      </div>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="bc-to">To</Label>
                        <input
                          id="bc-to"
                          type="date"
                          value={to}
                          min={from}
                          onChange={(ev) => setTo(ev.target.value)}
                          className={reportFilterControlClass}
                          required
                        />
                      </div>
                    </div>
                    <div
                      className={reportFilterPresetsGridClass}
                      role="group"
                      aria-label="Date presets"
                    >
                      {[
                        { id: "this_month", label: "This month" },
                        { id: "last_30", label: "Last 30 days" },
                        { id: "last_90", label: "Last 90 days" },
                        { id: "ytd", label: "Year to date" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            applyPreset(
                              p.id as
                                | "this_month"
                                | "last_30"
                                | "last_90"
                                | "ytd",
                            )
                          }
                          className={reportFilterPresetButtonClass}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className={reportFilterActionsClass}>
                      <Button
                        type="submit"
                        pending={state.kind === "loading"}
                        className={reportFilterActionButtonClass}
                      >
                        Refresh
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {state.kind === "loading" || state.kind === "idle" ? (
                <Card aria-hidden className="dashboard-surface" size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">League table</CardTitle>
                    <CardDescription>Loading…</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TableSkeleton rows={6} columns={6} />
                  </CardContent>
                </Card>
              ) : null}

              {state.kind === "error" ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}

              {state.kind === "ok" ? (
                <Card size="sm" className="dashboard-surface">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">League table</CardTitle>
                    <CardDescription>
                      {state.data.rows.length === 0
                        ? "Nothing to rank yet."
                        : `Ranked by booked revenue, ${state.data.from} to ${state.data.to}.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {state.data.rows.length === 0 ? (
                      <EmptyState
                        title="No barbers in this period"
                        description="Either no barbers exist yet, or none had bookings in this date range."
                      />
                    ) : (
                      <table className="w-full min-w-[56rem] text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">#</th>
                            <th className="py-2 pr-3 font-medium">Barber</th>
                            <th className="py-2 pr-3 font-medium">Booked</th>
                            <th className="py-2 pr-3 font-medium">Collected</th>
                            <th className="py-2 pr-3 font-medium">Bookings</th>
                            <th className="py-2 pr-3 font-medium">Cancel %</th>
                            <th className="py-2 pr-3 font-medium">Util %</th>
                            <th className="py-2 pr-3 font-medium">Customers</th>
                            <th className="py-2 pr-3 font-medium">Repeat</th>
                            <th className="py-2 pr-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.data.rows.map((row, idx) => (
                            <tr
                              key={row.barber_user_id}
                              className="border-b border-border/30 last:border-0"
                            >
                              <td className="py-2 pr-3 text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="py-2 pr-3 font-medium">
                                {row.barber_name}
                              </td>
                              <td className="py-2 pr-3">
                                {formatGbp(row.booked_cents)}
                              </td>
                              <td className="py-2 pr-3">
                                {formatGbp(row.collected_cents)}
                              </td>
                              <td className="py-2 pr-3">
                                {row.appointments_total}
                              </td>
                              <td className="py-2 pr-3">
                                {formatPct(row.cancellation_rate)}
                              </td>
                              <td className="py-2 pr-3">
                                {formatPct(row.utilization_pct)}
                              </td>
                              <td className="py-2 pr-3">
                                {row.customers_total}
                              </td>
                              <td className="py-2 pr-3">
                                {row.repeat_customers}
                              </td>
                              <td className="py-2 pr-3">
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    href={`/admin/barbers/${row.barber_user_id}/analytics`}
                                  >
                                    Drill in
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/admin/barbers"
              className="underline-offset-4 hover:underline"
            >
              Back to barbers
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
