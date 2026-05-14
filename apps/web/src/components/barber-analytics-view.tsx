"use client";

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
  ApiError,
  ApiValidationError,
  fetchBarberAnalytics,
} from "@ozilcuts/api";
import type { BarberAnalyticsReport } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiCard,
  KpiCardSkeleton,
  Label,
  TableSkeleton,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; report: BarberAnalyticsReport }
  | { kind: "error"; message: string };

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatBucketLabel(bucket: string): string {
  const [y, m, day] = bucket.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !day) return bucket;
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

type Props = {
  barberUserId: number;
  initialFrom?: string;
  initialTo?: string;
};

export function BarberAnalyticsView({
  barberUserId,
  initialFrom,
  initialTo,
}: Props) {
  const [from, setFrom] = useState<string>(initialFrom ?? startOfMonthIso());
  const [to, setTo] = useState<string>(initialTo ?? todayIso());
  const [state, setState] = useState<ReportState>({ kind: "idle" });

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const report = await fetchBarberAnalytics(token, barberUserId, {
        from,
        to,
      });
      setState({ kind: "ok", report });
    } catch (err: unknown) {
      const message =
        err instanceof ApiValidationError
          ? (err.firstMessage() ?? "Invalid filters.")
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load analytics.";
      setState({ kind: "error", message });
    }
  }, [from, to, barberUserId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const summaryTiles = useMemo(() => {
    if (state.kind !== "ok") return null;
    const s = state.report.summary;

    return [
      {
        label: "Bookings",
        value: String(s.appointments_total),
        hint: `${s.appointments_confirmed} confirmed · ${s.appointments_cancelled} cancelled`,
      },
      {
        label: "Cancellation rate",
        value: formatPct(s.cancellation_rate),
        hint: "cancelled / total",
      },
      {
        label: "Booked revenue",
        value: formatGbp(s.booked_cents),
        hint: `Collected ${formatGbp(s.collected_cents)}`,
      },
      {
        label: "Utilization",
        value: formatPct(s.utilization_pct),
        hint: `${formatHoursMinutes(s.booked_minutes)} of ${formatHoursMinutes(s.available_minutes)}`,
      },
      {
        label: "Customers",
        value: String(s.customers_total),
        hint: `${s.repeat_customers} repeat`,
      },
    ];
  }, [state]);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <Card size="sm" className="dashboard-surface">
        <CardHeader>
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>
            Appointments whose start time falls in this window.
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
                <Label htmlFor="ba-from">From</Label>
                <input
                  id="ba-from"
                  type="date"
                  value={from}
                  max={to}
                  onChange={(ev) => setFrom(ev.target.value)}
                  className={reportFilterControlClass}
                  required
                />
              </div>
              <div className={reportFilterFieldCellClass}>
                <Label htmlFor="ba-to">To</Label>
                <input
                  id="ba-to"
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
                      p.id as "this_month" | "last_30" | "last_90" | "ytd",
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
                disabled={state.kind === "loading"}
                className={reportFilterActionButtonClass}
              >
                {state.kind === "loading" ? "Loading…" : "Refresh"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {state.kind === "loading" || state.kind === "idle" ? (
        <div role="status" aria-label="Loading analytics">
          <span className="sr-only">Loading analytics…</span>
          <section
            aria-hidden
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </section>
          <Card aria-hidden className="dashboard-surface mt-5 md:mt-6" size="sm">
            <CardContent className="p-4">
              <TableSkeleton rows={5} columns={4} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ok" && summaryTiles ? (
        <>
          <section
            aria-label="Summary"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {summaryTiles.map((tile) => (
              <KpiCard
                key={tile.label}
                label={tile.label}
                value={tile.value}
                hint={tile.hint}
              />
            ))}
          </section>

          <section aria-label="Top services">
            <Card size="sm" className="dashboard-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top services</CardTitle>
                <CardDescription>
                  Confirmed appointments only.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {state.report.top_services.length === 0 ? (
                  <EmptyState
                    title="No services in this period"
                    description="No confirmed appointments fell into this date range."
                  />
                ) : (
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Service</th>
                        <th className="py-2 pr-3 font-medium">Bookings</th>
                        <th className="py-2 pr-3 font-medium">Booked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.report.top_services.map((row) => (
                        <tr
                          key={row.service_id}
                          className="border-b border-border/30 last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {row.service_name}
                          </td>
                          <td className="py-2 pr-3">{row.count}</td>
                          <td className="py-2 pr-3">
                            {formatGbp(row.booked_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Top customers">
            <Card size="sm" className="dashboard-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top customers</CardTitle>
                <CardDescription>
                  Confirmed visits only, ranked by visit count.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {state.report.top_customers.length === 0 ? (
                  <EmptyState
                    title="No customers in this period"
                    description="No customers booked confirmed visits in this range."
                  />
                ) : (
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Customer</th>
                        <th className="py-2 pr-3 font-medium">Visits</th>
                        <th className="py-2 pr-3 font-medium">Booked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.report.top_customers.map((row) => (
                        <tr
                          key={row.customer_user_id}
                          className="border-b border-border/30 last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {row.customer_name}
                          </td>
                          <td className="py-2 pr-3">{row.visits}</td>
                          <td className="py-2 pr-3">
                            {formatGbp(row.booked_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Daily series">
            <Card size="sm" className="dashboard-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily series</CardTitle>
                <CardDescription>
                  Per-day appointments, booked revenue, and collected deposits.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {state.report.series.length === 0 ? (
                  <EmptyState
                    title="No days in this range"
                    description="Pick a wider date range to see daily activity."
                  />
                ) : (
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Day</th>
                        <th className="py-2 pr-3 font-medium">Bookings</th>
                        <th className="py-2 pr-3 font-medium">Booked</th>
                        <th className="py-2 pr-3 font-medium">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.report.series.map((row) => {
                        const empty =
                          row.appointments_count === 0 &&
                          row.collected_cents === 0;

                        return (
                          <tr
                            key={row.bucket}
                            className={
                              empty
                                ? "border-b border-border/30 text-muted-foreground last:border-0"
                                : "border-b border-border/30 last:border-0"
                            }
                          >
                            <td className="py-2 pr-3 font-medium">
                              {formatBucketLabel(row.bucket)}
                            </td>
                            <td className="py-2 pr-3">
                              {row.appointments_count}
                            </td>
                            <td className="py-2 pr-3">
                              {formatGbp(row.booked_cents)}
                            </td>
                            <td className="py-2 pr-3">
                              {formatGbp(row.collected_cents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
