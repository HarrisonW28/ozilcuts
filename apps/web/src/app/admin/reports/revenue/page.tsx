"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { formatGbp } from "@/lib/format-gbp";
import {
  reportFilterActionButtonClass,
  reportFilterActionsClass,
  reportFilterControlClass,
  reportFilterFieldCellClass,
  reportFilterPresetButtonClass,
  reportFilterPresetsGridClass,
  reportFilterThreeColGridClass,
} from "@/lib/report-filter-classes";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  downloadRevenueReportCsv,
  fetchRevenueReport,
} from "@ozilcuts/api";
import type {
  RevenueReport,
  RevenueReportGranularity,
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
  EmptyState,
  KpiCard,
  KpiCardSkeleton,
  Label,
  ScreenTitle,
  TableSkeleton,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; report: RevenueReport }
  | { kind: "error"; message: string };

function isoToday(): string {
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

function formatBucketLabel(
  bucket: string,
  granularity: RevenueReportGranularity,
): string {
  if (granularity === "month") {
    const [y, m] = bucket.split("-").map((s) => Number.parseInt(s, 10));
    if (!y || !m) return bucket;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }
  const [y, m, day] = bucket.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !day) return bucket;
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AdminRevenueReportPage() {
  const { profile, signOut } = useSessionProfile();
  const [from, setFrom] = useState<string>(startOfMonthIso());
  const [to, setTo] = useState<string>(isoToday());
  const [granularity, setGranularity] =
    useState<RevenueReportGranularity>("day");
  const [state, setState] = useState<ReportState>({ kind: "idle" });
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

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
      const report = await fetchRevenueReport(token, {
        from,
        to,
        granularity,
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
              : "Failed to load revenue report.";
      setState({ kind: "error", message });
    }
  }, [from, to, granularity]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  async function onDownloadCsv() {
    const token = getStoredAuthToken();
    if (!token) return;
    setCsvBusy(true);
    setCsvError(null);
    try {
      await downloadRevenueReportCsv(token, { from, to, granularity });
    } catch (err: unknown) {
      setCsvError(
        err instanceof ApiError
          ? err.message
          : "Failed to download CSV. Please try again.",
      );
    } finally {
      setCsvBusy(false);
    }
  }

  function applyPreset(preset: "this_month" | "last_30" | "last_90" | "ytd") {
    if (preset === "this_month") {
      setFrom(startOfMonthIso());
      setTo(isoToday());
    } else if (preset === "last_30") {
      setFrom(isoOffsetDays(-29));
      setTo(isoToday());
    } else if (preset === "last_90") {
      setFrom(isoOffsetDays(-89));
      setTo(isoToday());
    } else if (preset === "ytd") {
      const year = new Date().getFullYear();
      setFrom(`${year}-01-01`);
      setTo(isoToday());
    }
  }

  const summaryCards = useMemo(() => {
    if (state.kind !== "ok") return null;
    const s = state.report.summary;

    return [
      { label: "Booked", value: formatGbp(s.booked_cents), hint: `${s.booked_appointments} appts` },
      { label: "Collected", value: formatGbp(s.collected_cents), hint: `${s.paid_appointments} paid` },
      { label: "Refunded", value: formatGbp(s.refunded_cents), hint: "this period" },
      { label: "Net collected", value: formatGbp(s.net_collected_cents), hint: "collected - refunded" },
    ];
  }, [state]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Revenue report"
            description="Booked vs. collected revenue, broken down by barber, service, and time."
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
                  This report is admin-only. Please sign in.
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
                    Window and granularity for all sections below.
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
                    <div className={reportFilterThreeColGridClass}>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="rev-from">From</Label>
                        <input
                          id="rev-from"
                          type="date"
                          value={from}
                          max={to}
                          onChange={(ev) => setFrom(ev.target.value)}
                          className={reportFilterControlClass}
                          required
                        />
                      </div>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="rev-to">To</Label>
                        <input
                          id="rev-to"
                          type="date"
                          value={to}
                          min={from}
                          onChange={(ev) => setTo(ev.target.value)}
                          className={reportFilterControlClass}
                          required
                        />
                      </div>
                      <div className={reportFilterFieldCellClass}>
                        <Label htmlFor="rev-granularity">Granularity</Label>
                        <select
                          id="rev-granularity"
                          value={granularity}
                          onChange={(ev) =>
                            setGranularity(
                              ev.target.value === "month" ? "month" : "day",
                            )
                          }
                          className={reportFilterControlClass}
                        >
                          <option value="day">Day</option>
                          <option value="month">Month</option>
                        </select>
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
                        disabled={state.kind === "loading"}
                        className={reportFilterActionButtonClass}
                      >
                        {state.kind === "loading" ? "Loading…" : "Refresh"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={reportFilterActionButtonClass}
                        onClick={() => void onDownloadCsv()}
                        disabled={csvBusy || state.kind !== "ok"}
                      >
                        {csvBusy ? "Preparing CSV…" : "Download CSV"}
                      </Button>
                      {csvError ? (
                        <span
                          className="min-w-0 flex-1 basis-full text-sm break-words text-destructive sm:basis-auto"
                          role="alert"
                        >
                          {csvError}
                        </span>
                      ) : null}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {state.kind === "loading" || state.kind === "idle" ? (
                <div role="status" aria-label="Loading revenue report">
                  <span className="sr-only">Loading…</span>
                  <section
                    aria-hidden
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {Array.from({ length: 4 }).map((_, i) => (
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

              {state.kind === "ok" && summaryCards ? (
                <>
                  <section
                    aria-label="Summary"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {summaryCards.map((card) => (
                      <KpiCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        hint={card.hint}
                      />
                    ))}
                  </section>

                  <section aria-label="By barber">
                    <Card size="sm" className="dashboard-surface">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">By barber</CardTitle>
                        <CardDescription>
                          Booked uses appointment date; collected uses payment
                          date.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {state.report.by_barber.length === 0 ? (
                          <EmptyState
                            title="No barber-attributed revenue"
                            description="Confirmed appointments in this range haven't been linked to a barber yet. Try widening the date range."
                          />
                        ) : (
                          <table className="w-full min-w-[40rem] text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Barber</th>
                                <th className="py-2 pr-3 font-medium">Booked</th>
                                <th className="py-2 pr-3 font-medium">Appts</th>
                                <th className="py-2 pr-3 font-medium">Collected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.report.by_barber.map((row) => (
                                <tr
                                  key={row.barber_user_id}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {row.barber_name}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {formatGbp(row.booked_cents)}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground">
                                    {row.booked_appointments}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {formatGbp(row.collected_cents)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </CardContent>
                    </Card>
                  </section>

                  <section aria-label="By service">
                    <Card size="sm" className="dashboard-surface">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">By service</CardTitle>
                        <CardDescription>
                          Top services driving revenue.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {state.report.by_service.length === 0 ? (
                          <EmptyState
                            title="No service-attributed revenue"
                            description="No services drove paid revenue in this range."
                          />
                        ) : (
                          <table className="w-full min-w-[40rem] text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Service</th>
                                <th className="py-2 pr-3 font-medium">Booked</th>
                                <th className="py-2 pr-3 font-medium">Appts</th>
                                <th className="py-2 pr-3 font-medium">Collected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.report.by_service.map((row) => (
                                <tr
                                  key={row.service_id}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {row.service_name}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {formatGbp(row.booked_cents)}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground">
                                    {row.booked_appointments}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {formatGbp(row.collected_cents)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </CardContent>
                    </Card>
                  </section>

                  <section aria-label="Time series">
                    <Card size="sm" className="dashboard-surface">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Series ({state.report.granularity})
                        </CardTitle>
                        <CardDescription>
                          Per-bucket booked and collected totals.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {state.report.series.length === 0 ? (
                          <EmptyState
                            title="No data points in this range"
                            description="Try a longer range or a different granularity."
                          />
                        ) : (
                          <table className="w-full min-w-[36rem] text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">When</th>
                                <th className="py-2 pr-3 font-medium">Booked</th>
                                <th className="py-2 pr-3 font-medium">Appts</th>
                                <th className="py-2 pr-3 font-medium">Collected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.report.series.map((row) => {
                                const empty =
                                  row.booked_cents === 0 &&
                                  row.collected_cents === 0;

                                return (
                                  <tr
                                    key={row.bucket}
                                    className={cn(
                                      "border-b border-border/30 last:border-0",
                                      empty ? "text-muted-foreground" : null,
                                    )}
                                  >
                                    <td className="py-2 pr-3 font-medium">
                                      {formatBucketLabel(
                                        row.bucket,
                                        state.report.granularity,
                                      )}
                                    </td>
                                    <td className="py-2 pr-3">
                                      {formatGbp(row.booked_cents)}
                                    </td>
                                    <td className="py-2 pr-3">
                                      {row.booked_appointments}
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
