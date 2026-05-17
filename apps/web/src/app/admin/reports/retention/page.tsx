"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchRetentionReport } from "@ozilcuts/api";
import type { RetentionReportSnapshot } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ScreenTitle,
  TableSkeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: RetentionReportSnapshot }
  | { kind: "error"; message: string };

function formatVisit(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminRetentionReportPage() {
  const { profile, signOut } = useSessionProfile();
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
      const data = await fetchRetentionReport(token);
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load retention preview.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

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
            title="Retention preview"
            description="Guests who may be due for a cut soon or haven't visited in a while — a snapshot for your team."
          />

          {!isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admin only</CardTitle>
                <CardDescription>
                  Sign in with an administrator account to view this report.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {isAdmin && state.kind === "loading" ? (
            <TableSkeleton rows={6} columns={6} />
          ) : null}
          {isAdmin && state.kind === "error" ? (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
              <p className="text-sm text-destructive">{state.message}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {isAdmin && state.kind === "ok" ? (
            <div className="flex flex-col gap-5 md:gap-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void load()}
                >
                  Refresh
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/reports/operations">Operations</Link>
                </Button>
              </div>

              <Card size="sm" className="dashboard-surface">
                <CardHeader>
                  <CardTitle className="text-base">Due soon</CardTitle>
                  <CardDescription>
                    Matches the smart rebook “around your usual cadence” window
                    (config:{" "}
                    <code className="text-xs">RETENTION_REBOOK_LEAD_DAYS</code>
                    ).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {state.data.due_soon.length === 0 ? (
                    <EmptyState title="No customers in this bucket right now" />
                  ) : (
                    <RetentionTable rows={state.data.due_soon} />
                  )}
                </CardContent>
              </Card>

              <Card size="sm" className="dashboard-surface">
                <CardHeader>
                  <CardTitle className="text-base">Inactivity-eligible</CardTitle>
                  <CardDescription>
                    Last visit older than the larger of{" "}
                    <code className="text-xs">RETENTION_INACTIVITY_MIN_DAYS</code>{" "}
                    and{" "}
                    <code className="text-xs">multiplier × interval</code>{" "}
                    (see{" "}
                    <code className="text-xs">config/notifications.php</code>
                    ).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {state.data.inactive_eligible.length === 0 ? (
                    <EmptyState title="No customers in this bucket right now" />
                  ) : (
                    <RetentionTable rows={state.data.inactive_eligible} />
                  )}
                </CardContent>
              </Card>
            </div>
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

function RetentionTable({
  rows,
}: {
  rows: RetentionReportSnapshot["due_soon"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Customer</th>
            <th className="py-2 pr-3 font-medium">Last visit</th>
            <th className="py-2 pr-3 font-medium">Cadence</th>
            <th className="py-2 pr-3 font-medium">Suggested</th>
            <th className="py-2 pr-3 font-medium">Days since</th>
            <th className="py-2 pr-3 font-medium">Paused</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.customer_user_id}-${r.appointment_id}`} className="border-b border-border/30">
              <td className="py-3 pr-3 align-top">
                <div className="font-medium text-foreground">{r.customer_name}</div>
                <div className="text-xs text-muted-foreground">{r.customer_email}</div>
              </td>
              <td className="py-3 pr-3 align-top text-muted-foreground">
                {formatVisit(r.last_visit_at)}
              </td>
              <td className="py-3 pr-3 align-top">{r.interval_days}d</td>
              <td className="py-3 pr-3 align-top">{r.suggested_date}</td>
              <td className="py-3 pr-3 align-top">
                {r.days_since_last_visit}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  (inactive ≥ {r.inactivity_threshold_days}d)
                </span>
              </td>
              <td className="py-3 pr-3 align-top">
                {r.retention_paused ? "Yes" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
