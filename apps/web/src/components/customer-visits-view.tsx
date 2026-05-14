"use client";

import { formatGbp } from "@/lib/format-gbp";
import type {
  AppointmentRecord,
  CustomerAnalyticsResponse,
} from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useMemo } from "react";

function formatLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimelineDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function monthHeading(iso: string | null): string {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function groupHistoryByMonth(rows: AppointmentRecord[]) {
  const groups: { heading: string; items: AppointmentRecord[] }[] = [];
  for (const row of rows) {
    const heading = monthHeading(row.starts_at);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.items.push(row);
    } else {
      groups.push({ heading, items: [row] });
    }
  }
  return groups;
}

function statusStyles(status: AppointmentRecord["status"]): string {
  if (status === "cancelled") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  return "border-primary/25 bg-primary/10 text-primary";
}

type Props = {
  data: CustomerAnalyticsResponse;
  /** Show a "View" link to the appointment confirmation page on each row. */
  linkAppointments?: boolean;
};

export function CustomerVisitsView({ data, linkAppointments = false }: Props) {
  const s = data.summary;

  const groupedHistory = useMemo(
    () => groupHistoryByMonth(data.history),
    [data.history],
  );

  const tiles = [
    {
      label: "Total visits",
      value: String(s.total_visits),
      hint: `${s.visits_by_status.cancelled} cancelled`,
    },
    {
      label: "Total spent",
      value: formatGbp(s.total_spent_cents),
      hint: `Booked ${formatGbp(s.total_booked_cents)}`,
    },
    {
      label: "Last visit",
      value: formatLong(s.last_visit_at),
      hint:
        s.first_visit_at && s.first_visit_at !== s.last_visit_at
          ? `First ${formatLong(s.first_visit_at)}`
          : "First visit",
    },
    {
      label: "Average cadence",
      value:
        s.avg_interval_days === null
          ? "—"
          : `${s.avg_interval_days.toFixed(1)} days`,
      hint: "Between confirmed visits",
    },
    {
      label: "Preferred barber",
      value: s.preferred_barber ? s.preferred_barber.name : "—",
      hint: s.preferred_barber ? "Most visits" : "No visits yet",
    },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <section
        aria-label="Visit summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            size="sm"
            className="dashboard-surface motion-card"
          >
            <CardHeader className="pb-2">
              <CardDescription>{tile.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{tile.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {tile.hint}
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Visit timeline">
        <Card size="sm" className="dashboard-surface">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Visit timeline</CardTitle>
            <CardDescription>
              Newest first, grouped by month for quick scanning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <div className="space-y-8">
                {groupedHistory.map((group, groupIdx) => (
                  <div key={`${group.heading}-${groupIdx}`}>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.heading}
                    </h3>
                    <ul className="relative flex flex-col gap-0" role="list">
                      {group.items.map((row, idx) => {
                        const isLastInHistory =
                          groupIdx === groupedHistory.length - 1
                          && idx === group.items.length - 1;

                        return (
                          <li
                            key={row.id}
                            className="relative flex gap-3 sm:gap-4"
                            role="listitem"
                          >
                            <div
                              className="flex w-9 shrink-0 flex-col items-center sm:w-10"
                              aria-hidden
                            >
                              <span
                                className={cn(
                                  "z-10 mt-1.5 size-3 shrink-0 rounded-full border-2 border-background shadow-sm sm:mt-2 sm:size-3.5",
                                  row.status === "confirmed"
                                    ? "bg-primary ring-2 ring-primary/30"
                                    : "bg-muted-foreground/50 ring-2 ring-border",
                                )}
                              />
                              {!isLastInHistory ? (
                                <span className="mt-0.5 mb-0 min-h-6 w-px flex-1 bg-gradient-to-b from-border to-border/20 sm:min-h-8" />
                              ) : null}
                            </div>

                            <div
                              className={cn(
                                "min-w-0 flex-1 pb-6 sm:pb-8",
                                isLastInHistory ? "pb-0 sm:pb-0" : null,
                              )}
                            >
                              <article
                                className={cn(
                                  "motion-interactive rounded-xl border border-border/50 bg-muted/10 p-4 shadow-none transition-[border-color,background-color] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]",
                                  "hover:border-border/80 hover:bg-muted/15",
                                )}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
                                      {formatTimelineDay(row.starts_at)}
                                      <span className="mx-1.5 text-border">
                                        ·
                                      </span>
                                      {formatTime(row.starts_at)}
                                    </p>
                                    <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                                      {row.service?.name ?? "Appointment"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {row.barber?.name
                                        ? `with ${row.barber.name}`
                                        : "Barber TBD"}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                                    <span
                                      className={cn(
                                        "inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                                        statusStyles(row.status),
                                      )}
                                    >
                                      {row.status}
                                    </span>
                                    {row.amount_paid_cents > 0 ? (
                                      <span className="text-sm font-medium tabular-nums text-foreground">
                                        {formatGbp(row.amount_paid_cents)}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {linkAppointments ? (
                                  <div className="mt-4 border-t border-border/35 pt-3">
                                    <Link
                                      href={`/appointments/${row.id}/confirmation`}
                                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border/60 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10"
                                    >
                                      View details
                                    </Link>
                                  </div>
                                ) : null}
                              </article>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
