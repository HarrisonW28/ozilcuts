"use client";

import type {
  CustomerAnalyticsResponse,
} from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ozilcuts/ui";
import Link from "next/link";

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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  data: CustomerAnalyticsResponse;
  /** Show a "View" link to the appointment confirmation page on each row. */
  linkAppointments?: boolean;
};

export function CustomerVisitsView({ data, linkAppointments = false }: Props) {
  const s = data.summary;

  const tiles = [
    {
      label: "Total visits",
      value: String(s.total_visits),
      hint: `${s.visits_by_status.cancelled} cancelled`,
    },
    {
      label: "Total spent",
      value: formatUsd(s.total_spent_cents),
      hint: `Booked ${formatUsd(s.total_booked_cents)}`,
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
    <div className="space-y-6">
      <section
        aria-label="Visit summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardDescription>{tile.label}</CardDescription>
              <CardTitle className="text-xl">{tile.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {tile.hint}
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Visit history">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent appointments</CardTitle>
            <CardDescription>
              Newest first, capped at 50 most recent.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {data.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Service</th>
                    <th className="py-2 pr-3 font-medium">Barber</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Paid</th>
                    {linkAppointments ? <th className="py-2 pr-3" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-2 pr-3 font-medium">
                        {formatDateTime(row.starts_at)}
                      </td>
                      <td className="py-2 pr-3">{row.service?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{row.barber?.name ?? "—"}</td>
                      <td className="py-2 pr-3 capitalize text-muted-foreground">
                        {row.status}
                      </td>
                      <td className="py-2 pr-3">
                        {row.amount_paid_cents > 0
                          ? formatUsd(row.amount_paid_cents)
                          : "—"}
                      </td>
                      {linkAppointments ? (
                        <td className="py-2 pr-3">
                          <Link
                            href={`/appointments/${row.id}/confirmation`}
                            className="text-sm underline-offset-4 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
