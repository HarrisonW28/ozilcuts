"use client";

import { formatHistoryWhen } from "@/lib/customer-recognition";
import type { AppointmentRecord } from "@ozilcuts/types";
import { History } from "lucide-react";
import Link from "next/link";

export function HistoryPreviewRow({ row }: { row: AppointmentRecord }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/30 py-2.5 text-sm last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {row.service?.name ?? "Service"}
        </p>
        <p className="text-caption text-muted-foreground">
          {formatHistoryWhen(row.starts_at)}
          {row.barber?.name ? ` · ${row.barber.name}` : ""}
        </p>
      </div>
      <Link
        href={`/appointments/${row.id}/confirmation`}
        className="shrink-0 text-caption font-medium text-primary underline-offset-4 hover:underline"
      >
        Open
      </Link>
    </li>
  );
}

type RecognitionHistoryPreviewProps = {
  rows: AppointmentRecord[];
  maxRows?: number;
  showTitle?: boolean;
  emptyMessage?: string;
  className?: string;
};

export function RecognitionHistoryPreview({
  rows,
  maxRows,
  showTitle = true,
  emptyMessage = "No earlier visits on file — this is their first cut in the books.",
  className,
}: RecognitionHistoryPreviewProps) {
  const visible = maxRows != null ? rows.slice(0, maxRows) : rows;

  if (rows.length === 0) {
    return <p className={className ?? "text-sm text-muted-foreground"}>{emptyMessage}</p>;
  }

  return (
    <div className={className}>
      {showTitle ? (
        <p className="mb-1 flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-3.5" aria-hidden />
          Recent history
        </p>
      ) : null}
      <ul className="rounded-xl border border-border/40 bg-background/50 p-2 dark:bg-background/35">
        {visible.map((row) => (
          <HistoryPreviewRow key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
}
