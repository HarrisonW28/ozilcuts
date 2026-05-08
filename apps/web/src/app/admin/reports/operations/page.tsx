"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchOperationalInsights,
} from "@ozilcuts/api";
import type { OperationalInsightsReport } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: OperationalInsightsReport }
  | { kind: "error"; message: string };

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${m}-${day}`;
}

function isoOffsetDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatHourLabel(hour: number): string {
  const ampm = hour < 12 ? "a" : "p";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${ampm}`;
}

export default function AdminOperationalInsightsPage() {
  const { profile, signOut } = useSessionProfile();
  const [from, setFrom] = useState<string>(isoOffsetDays(-29));
  const [to, setTo] = useState<string>(todayIso());
  const [state, setState] = useState<LoadState>({ kind: "idle" });

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
      const data = await fetchOperationalInsights(token, { from, to });
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

  // For the heatmap, scale color intensity by max-cell.
  const maxHeatmapCount = useMemo(() => {
    if (state.kind !== "ok") return 0;
    let max = 0;
    for (const cell of state.data.peak_heatmap) {
      if (cell.count > max) max = cell.count;
    }
    return max;
  }, [state]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Operations"
            description="Today's pulse, the upcoming week, and patterns that drive scheduling decisions."
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
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>
                    Range applies to peak times and lead-time distributions.
                    Today / next 7 days are always live.
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="ops-from">From</Label>
                        <input
                          id="ops-from"
                          type="date"
                          value={from}
                          max={to}
                          onChange={(ev) => setFrom(ev.target.value)}
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="ops-to">To</Label>
                        <input
                          id="ops-to"
                          type="date"
                          value={to}
                          min={from}
                          onChange={(ev) => setTo(ev.target.value)}
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
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
                          className="min-h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/60 sm:min-h-9"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <Button
                        type="submit"
                        disabled={state.kind === "loading"}
                      >
                        {state.kind === "loading" ? "Loading…" : "Refresh"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {state.kind === "loading" ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Loading…
                </p>
              ) : null}
              {state.kind === "error" ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}

              {state.kind === "ok" ? (
                <>
                  <section
                    aria-label="Today"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Today&rsquo;s confirmed
                        </CardDescription>
                        <CardTitle className="text-2xl">
                          {state.data.today.confirmed}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {state.data.today.cancelled} cancelled today
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Deposits collected today
                        </CardDescription>
                        <CardTitle className="text-2xl">
                          {formatUsd(state.data.today.deposits_collected_cents)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {formatUsd(state.data.today.deposits_pending_cents)}{" "}
                        pending
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Next 7 days</CardDescription>
                        <CardTitle className="text-2xl">
                          {state.data.week.confirmed}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {state.data.week.cancelled} cancelled ·{" "}
                        {formatPct(state.data.week.cancel_rate)} cancel rate
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Deposits this week</CardDescription>
                        <CardTitle className="text-2xl">
                          {formatUsd(state.data.week.deposits_collected_cents)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {formatUsd(state.data.week.deposits_pending_cents)}{" "}
                        pending in next 7 days
                      </CardContent>
                    </Card>
                  </section>

                  <section aria-label="Peak times">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Peak times
                        </CardTitle>
                        <CardDescription>
                          Confirmed appointments by weekday × hour over the
                          selected range.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {maxHeatmapCount === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No confirmed appointments in this range.
                          </p>
                        ) : (
                          <table className="w-full min-w-[44rem] border-separate border-spacing-px text-xs">
                            <thead>
                              <tr>
                                <th
                                  scope="col"
                                  className="sticky left-0 bg-background py-1 pr-2 text-left text-muted-foreground"
                                >
                                  Day
                                </th>
                                {Array.from({ length: 24 }, (_, h) => (
                                  <th
                                    key={h}
                                    scope="col"
                                    className="px-1 py-1 text-center font-medium text-muted-foreground"
                                  >
                                    {formatHourLabel(h)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[0, 1, 2, 3, 4, 5, 6].map((w) => {
                                const row = state.data.peak_heatmap.filter(
                                  (c) => c.weekday === w,
                                );
                                const label = row[0]?.weekday_label ?? "";
                                return (
                                  <tr key={w}>
                                    <th
                                      scope="row"
                                      className="sticky left-0 bg-background py-1 pr-2 text-left font-medium"
                                    >
                                      {label}
                                    </th>
                                    {row.map((cell) => {
                                      const intensity =
                                        cell.count === 0
                                          ? 0
                                          : Math.min(
                                              1,
                                              cell.count / maxHeatmapCount,
                                            );
                                      const opacity =
                                        intensity === 0 ? 0.06 : intensity;
                                      const cellLabel = `${cell.weekday_label} ${formatHourLabel(cell.hour)}: ${cell.count} ${cell.count === 1 ? "appointment" : "appointments"}`;
                                      return (
                                        <td
                                          key={cell.hour}
                                          aria-label={cellLabel}
                                          title={cellLabel}
                                          className="px-1 py-1 text-center"
                                        >
                                          <div
                                            className="mx-auto flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium tabular-nums text-foreground"
                                            style={{
                                              backgroundColor: `oklch(0.55 0.14 240 / ${opacity})`,
                                            }}
                                          >
                                            {cell.count > 0 ? cell.count : ""}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </CardContent>
                    </Card>
                  </section>

                  <section
                    aria-label="Lead times"
                    className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Booking lead time
                        </CardTitle>
                        <CardDescription>
                          How far in advance customers book.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[24rem] text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="py-2 pr-3 font-medium">Bucket</th>
                              <th className="py-2 pr-3 font-medium">
                                Bookings
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.data.booking_lead_time.map((b) => (
                              <tr
                                key={b.label}
                                className="border-b border-border/30 last:border-0"
                              >
                                <td className="py-2 pr-3 font-medium">
                                  {b.label}
                                </td>
                                <td className="py-2 pr-3">{b.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Cancellation lead time
                        </CardTitle>
                        <CardDescription>
                          How close to the appointment customers cancel.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[24rem] text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="py-2 pr-3 font-medium">Bucket</th>
                              <th className="py-2 pr-3 font-medium">
                                Cancellations
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.data.cancellation_lead_time.map((b) => (
                              <tr
                                key={b.label}
                                className="border-b border-border/30 last:border-0"
                              >
                                <td className="py-2 pr-3 font-medium">
                                  {b.label}
                                </td>
                                <td className="py-2 pr-3">{b.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </section>
                </>
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
