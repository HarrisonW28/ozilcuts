"use client";

import { ArrivalFlowStrip } from "@/components/arrival-flow-strip";
import { BarberOperationalArrivalTap } from "@/components/barber-operational/barber-operational-arrival-tap";
import { BarberOperationalOneTapStrip } from "@/components/barber-operational/barber-operational-one-tap-strip";
import {
  formatStart,
  formatStartTime,
} from "@/lib/barber-operational-home";
import { OperationalStatusChip } from "@/components/operational-status-chip";
import { LiveChairIndicator } from "@/components/operational/live-chair-indicator";
import { deriveOperationalStatus } from "@/lib/shop-live-status";
import type { LiveShopSummary } from "@/lib/shop-live-status";
import type {
  AppointmentArrivalState,
  AppointmentRecord,
  AuthUser,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { Scissors } from "lucide-react";
import Link from "next/link";

type BarberOperationalNowCardProps = {
  row: AppointmentRecord;
  user: AuthUser;
  thumb: string | null;
  nowMs: number;
  arrivalBusy: boolean;
  lateBusy: boolean;
  lateSent: boolean;
  liveSummary?: LiveShopSummary | null;
  onRunningLate: (row: AppointmentRecord, minutes: number) => void | Promise<void>;
  onQuickRefresh?: () => void;
  onQuickActionError?: (message: string) => void;
  onAdvance: (
    row: AppointmentRecord,
    next: AppointmentArrivalState,
  ) => void | Promise<void>;
};

export function BarberOperationalNowCard({
  row,
  user,
  thumb,
  nowMs,
  arrivalBusy,
  lateBusy,
  lateSent,
  liveSummary,
  onRunningLate,
  onQuickRefresh,
  onQuickActionError,
  onAdvance,
}: BarberOperationalNowCardProps) {
  const opStatus = deriveOperationalStatus(row, nowMs);
  const serving = liveSummary?.serving ?? null;

  return (
    <Card className="brand-gradient-hero barber-operational-now overflow-hidden border-primary/35 shadow-md dark:border-primary/30">
      <CardHeader className="space-y-3 pb-2">
        <p className="text-micro font-semibold uppercase tracking-wide text-primary">
          Focus now
        </p>
        <div className="flex gap-3">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/25",
              "size-16 sm:size-20",
            )}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="size-full object-cover"
                width={80}
                height={80}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Scissors className="size-7 opacity-50" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-xl leading-tight tracking-tight sm:text-2xl">
              {row.customer?.name ?? "Guest"}
            </CardTitle>
            <CardDescription className="text-sm text-foreground/90">
              {row.service?.name ?? "Service"} ·{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatStartTime(row.starts_at)}
              </span>
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <OperationalStatusChip status={opStatus} compact />
              <p className="text-caption text-muted-foreground">
                {formatStart(row.starts_at)}
              </p>
            </div>
          </div>
        </div>
        {liveSummary ? (
          <LiveChairIndicator
            inUse={serving !== null}
            guestName={serving?.customer?.name}
            serviceName={serving?.service?.name}
            className="w-fit"
          />
        ) : null}
        <ArrivalFlowStrip state={row.arrival_state} className="pt-1" />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <BarberOperationalOneTapStrip
          row={row}
          user={user}
          variant="comfortable"
          lateBusy={lateBusy}
          lateSent={lateSent}
          onRunningLate={onRunningLate}
          onChairReadyDone={onQuickRefresh}
          onActionError={onQuickActionError}
        />
        <BarberOperationalArrivalTap
          row={row}
          pending={arrivalBusy}
          onAdvance={onAdvance}
          fullWidth
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border/40 bg-muted/10 pt-4 dark:bg-muted/5">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
        >
          <Link href={`/appointments/${row.id}/confirmation`}>Open visit</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
        >
          <Link href={`/appointments/${row.id}/check-in`}>Check-in screen</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
