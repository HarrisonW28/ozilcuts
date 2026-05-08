"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchCustomerAnalyticsAggregate,
} from "@ozilcuts/api";
import type { CustomerAnalyticsAggregate } from "@ozilcuts/types";
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
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerAnalyticsAggregate }
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
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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

export default function AdminCustomersReportPage() {
  const { profile, signOut } = useSessionProfile();
  const [from, setFrom] = useState<string>(startOfMonthIso());
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
      const data = await fetchCustomerAnalyticsAggregate(token, { from, to });
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
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Customers"
            description="Aggregate customer-base report: who's active, who's new, who's coming back, and lifetime value."
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
                  <CardDescription>Pick a date range.</CardDescription>
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
                        <Label htmlFor="cu-from">From</Label>
                        <input
                          id="cu-from"
                          type="date"
                          value={from}
                          max={to}
                          onChange={(ev) => setFrom(ev.target.value)}
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="cu-to">To</Label>
                        <input
                          id="cu-to"
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
                    aria-label="Customer summary"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {[
                      {
                        label: "Active customers",
                        value: String(state.data.active_customers),
                        hint: `${state.data.visits_total} visits in period`,
                      },
                      {
                        label: "New customers",
                        value: String(state.data.new_customers),
                        hint: "First ever visit in range",
                      },
                      {
                        label: "Returning customers",
                        value: String(state.data.returning_customers),
                        hint: "Active + had a prior visit",
                      },
                      {
                        label: "Avg cadence",
                        value:
                          state.data.avg_interval_days === null
                            ? "—"
                            : `${state.data.avg_interval_days.toFixed(1)} d`,
                        hint: `Avg ${state.data.visits_per_customer_avg} visits / customer`,
                      },
                    ].map((tile) => (
                      <Card key={tile.label}>
                        <CardHeader className="pb-2">
                          <CardDescription>{tile.label}</CardDescription>
                          <CardTitle className="text-2xl">
                            {tile.value}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                          {tile.hint}
                        </CardContent>
                      </Card>
                    ))}
                  </section>

                  <section aria-label="Lifetime value distribution">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Lifetime value distribution
                        </CardTitle>
                        <CardDescription>
                          Customers grouped by total collected deposits across
                          all-time.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[28rem] text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="py-2 pr-3 font-medium">Bucket</th>
                              <th className="py-2 pr-3 font-medium">Customers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.data.ltv_distribution.map((b) => (
                              <tr
                                key={b.label}
                                className="border-b border-border/30 last:border-0"
                              >
                                <td className="py-2 pr-3 font-medium">
                                  {b.label}
                                </td>
                                <td className="py-2 pr-3">{b.customers}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </section>

                  <section
                    aria-label="Top customers"
                    className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Top spenders
                        </CardTitle>
                        <CardDescription>By collected deposits.</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {state.data.top_spenders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No paid customers in this period.
                          </p>
                        ) : (
                          <table className="w-full min-w-[28rem] text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Customer</th>
                                <th className="py-2 pr-3 font-medium">Spent</th>
                                <th className="py-2 pr-3 font-medium">Visits</th>
                                <th className="py-2 pr-3 font-medium">Last</th>
                                <th className="py-2 pr-3" />
                              </tr>
                            </thead>
                            <tbody>
                              {state.data.top_spenders.map((row) => (
                                <tr
                                  key={row.customer_user_id}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {row.customer_name}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {formatUsd(row.total_spent_cents)}
                                  </td>
                                  <td className="py-2 pr-3">{row.visits}</td>
                                  <td className="py-2 pr-3 text-muted-foreground">
                                    {formatLong(row.last_visit_at)}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Link
                                      href={`/admin/customers/${row.customer_user_id}/analytics`}
                                      className="text-sm underline-offset-4 hover:underline"
                                    >
                                      Drill in
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Top visitors
                        </CardTitle>
                        <CardDescription>By visit count.</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {state.data.top_visitors.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No visitors in this period.
                          </p>
                        ) : (
                          <table className="w-full min-w-[28rem] text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Customer</th>
                                <th className="py-2 pr-3 font-medium">Visits</th>
                                <th className="py-2 pr-3 font-medium">Spent</th>
                                <th className="py-2 pr-3 font-medium">Last</th>
                                <th className="py-2 pr-3" />
                              </tr>
                            </thead>
                            <tbody>
                              {state.data.top_visitors.map((row) => (
                                <tr
                                  key={row.customer_user_id}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {row.customer_name}
                                  </td>
                                  <td className="py-2 pr-3">{row.visits}</td>
                                  <td className="py-2 pr-3">
                                    {formatUsd(row.total_spent_cents)}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground">
                                    {formatLong(row.last_visit_at)}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Link
                                      href={`/admin/customers/${row.customer_user_id}/analytics`}
                                      className="text-sm underline-offset-4 hover:underline"
                                    >
                                      Drill in
                                    </Link>
                                  </td>
                                </tr>
                              ))}
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
