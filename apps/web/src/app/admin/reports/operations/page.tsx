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
import {
  OperationalAiInsightsSection,
  OperationalAiInsightsSkeleton,
} from "@/components/operational-ai-insights";
import { ShopOperationalIntelligenceBoard } from "@/components/shop-operational";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchOperationalInsights,
} from "@ozilcuts/api";
import type { OperationalInsightsReport } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiCard,
  KpiCardSkeleton,
  Label,
  ScreenTitle,
  TableSkeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: OperationalInsightsReport }
  | { kind: "error"; message: string };

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
        className="page-main"
      >
        <div className="mx-auto w-full max-w-6xl page-stack">
          <ScreenTitle
            title="Operations"
            description="Today's pulse, the upcoming week, and patterns that drive scheduling decisions."
          />

          {isAdmin ? (
            <ShopOperationalIntelligenceBoard className="rounded-2xl border border-border/50 bg-card/30 p-4 sm:p-5 dark:bg-card/20" />
          ) : null}

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
                    Historical slice for peaks and lead times. Live widgets use
                    today and the next 7 days.
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
                        <Label htmlFor="ops-from">From</Label>
                        <input
                          id="ops-from"
                          type="date"
                          value={from}
                          max={to}
                          onChange={(ev) => setFrom(ev.target.value)}
                          className={reportFilterControlClass}
                          required
                        />
                      </div>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="ops-to">To</Label>
                        <input
                          id="ops-to"
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
                <div role="status" aria-label="Loading operations report">
                  <span className="sr-only">Loading…</span>
                  <section
                    aria-hidden
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
                      <KpiCardSkeleton key={i} />
                    ))}
                  </section>
                  <div className="mt-5 md:mt-6">
                    <OperationalAiInsightsSkeleton />
                  </div>
                  <Card
                    aria-hidden
                    className="dashboard-surface mt-5 md:mt-6"
                    size="sm"
                  >
                    <CardContent className="p-4">
                      <TableSkeleton rows={6} columns={5} />
                    </CardContent>
                  </Card>
                </div>
              ) : null}
              {state.kind === "error" ? (
                <Card role="alert" className="border-destructive/30 bg-destructive/[0.04]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Couldn&apos;t load operations
                    </CardTitle>
                    <CardDescription>{state.message}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 touch-manipulation"
                      onClick={() => {
                        void load();
                      }}
                    >
                      Try again
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}

              {state.kind === "ok" ? (
                <>
                  <section
                    aria-label="Today"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <KpiCard
                      label={<>Today&rsquo;s confirmed</>}
                      value={state.data.today.confirmed}
                      hint={`${state.data.today.cancelled} cancelled today`}
                    />
                    <KpiCard
                      label="Deposits collected today"
                      value={formatGbp(
                        state.data.today.deposits_collected_cents,
                      )}
                      hint={`${formatGbp(
                        state.data.today.deposits_pending_cents,
                      )} pending`}
                    />
                    <KpiCard
                      label="Next 7 days"
                      value={state.data.week.confirmed}
                      hint={`${state.data.week.cancelled} cancelled · ${formatPct(state.data.week.cancel_rate)} cancel rate`}
                    />
                    <KpiCard
                      label="Deposits this week"
                      value={formatGbp(
                        state.data.week.deposits_collected_cents,
                      )}
                      hint={`${formatGbp(
                        state.data.week.deposits_pending_cents,
                      )} pending in next 7 days`}
                    />
                  </section>

                  <div className="mt-5 md:mt-6">
                    <OperationalAiInsightsSection
                      insights={state.data.ai_insights}
                    />
                  </div>

                  <section aria-label="Peak times">
                    <Card size="sm" className="dashboard-surface">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Peak times
                        </CardTitle>
                        <CardDescription>
                          Confirmed bookings by weekday and hour.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {maxHeatmapCount === 0 ? (
                          <EmptyState
                            title="No confirmed appointments in this range"
                            description="Pick a wider window or check back after more bookings come in."
                          />
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
                    <Card size="sm" className="dashboard-surface">
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

                    <Card size="sm" className="dashboard-surface">
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
