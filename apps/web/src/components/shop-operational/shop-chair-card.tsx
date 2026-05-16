"use client";

import { LiveChairIndicator } from "@/components/operational/live-chair-indicator";
import type { ShopOperationalChair } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Clock, Users } from "lucide-react";

function formatUtilPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function chairStateLabel(state: ShopOperationalChair["chair"]["state"]): string {
  switch (state) {
    case "in_use":
      return "In chair";
    case "guests_waiting":
      return "Guests waiting";
    case "catching_up":
      return "Catching up";
    case "open":
    default:
      return "Chair open";
  }
}

type ShopChairCardProps = {
  chair: ShopOperationalChair;
  highlight?: boolean;
  className?: string;
};

export function ShopChairCard({
  chair,
  highlight,
  className,
}: ShopChairCardProps) {
  const util = chair.utilization.utilization_pct;
  const utilWidth = Math.min(100, Math.round(util * 100));

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/50 bg-card/80 p-4 shadow-xs dark:bg-card/40",
        highlight && "ring-2 ring-primary/25 border-primary/30",
        className,
      )}
      aria-label={`${chair.barber_name} chair`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {chair.barber_name}
          </h3>
          {chair.barber_title ? (
            <p className="truncate text-xs text-muted-foreground">
              {chair.barber_title}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-medium",
            chair.chair.state === "in_use"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : chair.chair.state === "guests_waiting"
                ? "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100"
                : chair.chair.state === "catching_up"
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                  : "border-border/55 bg-muted/20 text-muted-foreground",
          )}
        >
          {chairStateLabel(chair.chair.state)}
        </span>
      </div>

      <div className="mt-3">
        <LiveChairIndicator
          inUse={chair.chair.in_use}
          guestName={chair.chair.serving?.customer_name}
          serviceName={chair.chair.serving?.service_name}
          compact
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Utilization</span>
          <span className="tabular-nums font-semibold text-foreground">
            {formatUtilPct(util)}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted/50"
          role="progressbar"
          aria-valuenow={utilWidth}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${chair.barber_name} utilization`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              util >= 0.85
                ? "bg-primary"
                : util >= 0.5
                  ? "bg-primary/70"
                  : "bg-primary/45",
            )}
            style={{ width: `${utilWidth}%` }}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          {chair.utilization.booked_minutes} / {chair.utilization.available_minutes}{" "}
          min booked
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-border/45 bg-muted/15 px-2.5 py-2">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            Waiting
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
            {chair.workload.waiting_count}
          </dd>
        </div>
        <div className="rounded-lg border border-border/45 bg-muted/15 px-2.5 py-2">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            Remaining
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
            {chair.workload.remaining_today}
          </dd>
        </div>
      </dl>
    </article>
  );
}
