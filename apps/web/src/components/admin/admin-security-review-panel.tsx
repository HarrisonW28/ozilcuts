"use client";

import {
  formatAuditAction,
  formatAuditCategory,
} from "@/lib/audit-log-labels";
import type { AdminSecurityReview } from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  KpiCard,
} from "@ozilcuts/ui";
import { ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";

type AdminSecurityReviewPanelProps = {
  review: AdminSecurityReview;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminSecurityReviewPanel({ review }: AdminSecurityReviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Privileged (24h)"
          value={String(review.privileged_actions_24h)}
          hint="Staff catalog, team, CRM"
        />
        <KpiCard
          label="Security (24h)"
          value={String(review.security_events_24h)}
          hint="Auth and account events"
        />
        <KpiCard
          label="Failed logins (24h)"
          value={String(review.failed_logins_24h)}
          hint="Invalid credentials"
        />
        <KpiCard
          label="Staff logins (24h)"
          value={String(review.staff_logins_24h)}
          hint="Admin and barber sessions"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden />
              Role distribution
            </CardTitle>
            <CardDescription>Current accounts by role — use for escalation review.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border/50 bg-muted/15 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {review.role_counts.admin}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {review.role_counts.barber}
              </p>
              <p className="text-xs text-muted-foreground">Barbers</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 p-3">
              <p className="text-2xl font-semibold tabular-nums">
                {review.role_counts.customer}
              </p>
              <p className="text-xs text-muted-foreground">Customers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" aria-hidden />
              Role escalations (7d)
            </CardTitle>
            <CardDescription>New barber accounts created by admins.</CardDescription>
          </CardHeader>
          <CardContent>
            {review.role_escalations_7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new barber accounts this week.</p>
            ) : (
              <ul className="space-y-2">
                {review.role_escalations_7d.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-border/45 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {row.target_user?.name ?? "New barber"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {row.actor?.name ?? "system"} · {formatWhen(row.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            Recent warnings
          </CardTitle>
          <CardDescription>High-signal events from the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {review.recent_highlights.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
              No warning-level events in the review window.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {review.recent_highlights.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatAuditAction(row.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.actor?.name ?? "System"}
                      {row.target_user ? ` → ${row.target_user.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {formatAuditCategory(row.category)}
                    </span>
                    <span>{formatWhen(row.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
