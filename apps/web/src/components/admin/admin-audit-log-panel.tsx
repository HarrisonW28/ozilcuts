"use client";

import {
  formatAuditAction,
  formatAuditCategory,
} from "@/lib/audit-log-labels";
import type { AuditLogEntry, AuditLogIndexMeta } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Label,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";

type AdminAuditLogPanelProps = {
  entries: AuditLogEntry[];
  meta: AuditLogIndexMeta | null;
  loading: boolean;
  category: string;
  severity: string;
  onCategoryChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onPageChange: (page: number) => void;
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

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-destructive/15 text-destructive";
    case "warning":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AdminAuditLogPanel({
  entries,
  meta,
  loading,
  category,
  severity,
  onCategoryChange,
  onSeverityChange,
  onPageChange,
}: AdminAuditLogPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4 text-primary" aria-hidden />
          Audit log
        </CardTitle>
        <CardDescription>
          Immutable record of privileged actions and security events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="audit-category">Category</Label>
            <select
              id="audit-category"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All</option>
              <option value="privileged">Privileged</option>
              <option value="security">Security</option>
              <option value="operational">Operational</option>
            </select>
          </div>
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="audit-severity">Severity</Label>
            <select
              id="audit-severity"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={severity}
              onChange={(e) => onSeverityChange(e.target.value)}
            >
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : null}

        {!loading && entries.length === 0 ? (
          <EmptyState
            title="No audit entries"
            description="Try widening filters or perform a privileged action to generate history."
          />
        ) : null}

        {!loading && entries.length > 0 ? (
          <ul className="divide-y divide-border/40 rounded-xl border border-border/45">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {formatAuditAction(row.action)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.actor?.name ?? "System"}
                    {row.actor?.email ? ` (${row.actor.email})` : ""}
                    {row.target_user
                      ? ` → ${row.target_user.name}`
                      : ""}
                  </p>
                  {row.ip_address ? (
                    <p className="text-xs text-muted-foreground">
                      IP {row.ip_address}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      severityClass(row.severity),
                    )}
                  >
                    {row.severity}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {formatAuditCategory(row.category)}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatWhen(row.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {meta && meta.last_page > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-2">
            <p className="text-sm text-muted-foreground">
              Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10"
                disabled={meta.current_page <= 1 || loading}
                onClick={() => onPageChange(meta.current_page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10"
                disabled={meta.current_page >= meta.last_page || loading}
                onClick={() => onPageChange(meta.current_page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
