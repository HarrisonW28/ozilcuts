"use client";

import { ArrivalFlowStrip } from "@/components/arrival-flow-strip";
import { BarberOperationalArrivalTap } from "@/components/barber-operational/barber-operational-arrival-tap";
import { BarberOperationalOneTapStrip } from "@/components/barber-operational/barber-operational-one-tap-strip";
import {
  formatStart,
  isPastStart,
} from "@/lib/barber-operational-home";
import {
  countWaitingAhead,
  deriveOperationalStatus,
  estimateMinutesAheadInQueue,
} from "@/lib/shop-live-status";
import type {
  AppointmentArrivalState,
  AppointmentRecord,
  AuthUser,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { RecognitionContextualStrip } from "@/components/recognition";
import { PresenceCheckedInChip } from "@/components/presence";
import { OperationalStatusChip } from "@/components/operational-status-chip";
import { Scissors } from "lucide-react";
import Link from "next/link";

export type BarberAppointmentActionState = {
  cancelBusyId: number | null;
  reminderBusyId: number | null;
  reminderSentId: number | null;
  lateBusyId: number | null;
  lateSentId: number | null;
  arrivalBusyId: number | null;
};

type BarberOperationalAppointmentCardProps = {
  row: AppointmentRecord;
  user: AuthUser;
  dense: boolean;
  queue: AppointmentRecord[];
  thumb: string | null;
  nowMs: number;
  actions: BarberAppointmentActionState;
  onCancel: (row: AppointmentRecord) => void;
  onReminder: (row: AppointmentRecord) => void;
  onRunningLate: (row: AppointmentRecord, minutes: number) => void;
  onAdvance: (
    row: AppointmentRecord,
    next: AppointmentArrivalState,
  ) => void | Promise<void>;
  onRefreshAfterQuickPing?: () => void;
  onQuickActionError?: (message: string) => void;
};

export function BarberOperationalAppointmentCard({
  row,
  user,
  dense,
  queue,
  thumb,
  nowMs,
  actions,
  onCancel,
  onReminder,
  onRunningLate,
  onAdvance,
  onRefreshAfterQuickPing,
  onQuickActionError,
}: BarberOperationalAppointmentCardProps) {
  const past = isPastStart(row.starts_at);
  const canMutate = row.status === "confirmed" && !past;
  const canSendReminder =
    row.status === "confirmed" && !past && row.barber?.id === user.id;
  const opStatus = deriveOperationalStatus(row, nowMs);
  const est =
    queue.length > 0 ? estimateMinutesAheadInQueue(queue, row.id, nowMs) : null;
  const waitAhead =
    queue.length > 0 ? countWaitingAhead(queue, row.id, nowMs) : 0;
  const arrivalHighlight =
    row.arrival_state === "arrived" ||
    row.arrival_state === "waiting" ||
    row.arrival_state === "in_chair";

  return (
    <Card
      className={cn(
        "dashboard-surface overflow-hidden",
        past && "opacity-80",
        arrivalHighlight &&
          "border-l-[3px] border-l-teal-500/70 dark:border-l-teal-400/55",
      )}
    >
      <CardHeader className={cn("pb-2", dense ? "space-y-1" : "space-y-2")}>
        <div className="flex gap-3">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/25",
              dense ? "size-12" : "size-14 sm:size-16",
            )}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="size-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Scissors
                  className={cn("opacity-50", dense ? "size-5" : "size-6")}
                  aria-hidden
                />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle
              className={cn(
                "leading-snug tracking-tight",
                dense ? "text-base" : "text-lg",
              )}
            >
              {row.customer?.name ?? "Customer"}
            </CardTitle>
            <CardDescription className="text-sm leading-snug text-foreground/90">
              {row.service?.name ?? "Service"} ·{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatStart(row.starts_at)}
              </span>
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <OperationalStatusChip status={opStatus} compact={dense} />
              {dense ? <PresenceCheckedInChip state={row.arrival_state} /> : null}
              {actions.lateSentId === row.id ? (
                <span className="text-caption font-medium text-primary">
                  Late notice sent
                </span>
              ) : null}
            </div>
            {dense ? (
              <ArrivalFlowStrip state={row.arrival_state} compact className="pt-1" />
            ) : null}
            {!dense && est != null ? (
              <p className="text-caption text-muted-foreground">
                ~{est} min of chair time ahead at this point.
              </p>
            ) : null}
            {!dense && est == null && waitAhead > 0 ? (
              <p className="text-caption text-muted-foreground">
                {waitAhead} ahead in arrival queue
              </p>
            ) : null}
            {!dense ? (
              <ArrivalFlowStrip
                state={row.arrival_state}
                compact={dense}
                className="pt-1.5"
              />
            ) : null}
            {!dense && row.customer?.id ? (
              <RecognitionContextualStrip
                appointmentId={row.id}
                currentServiceId={row.service?.id ?? null}
                className="mt-2"
              />
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="flex flex-col gap-2 border-t border-border/40 bg-muted/5 pt-3 dark:bg-muted/10">
        <BarberOperationalOneTapStrip
          row={row}
          user={user}
          variant={dense ? "compact" : "comfortable"}
          lateBusy={actions.lateBusyId === row.id}
          lateSent={actions.lateSentId === row.id}
          onRunningLate={onRunningLate}
          onChairReadyDone={onRefreshAfterQuickPing}
          onActionError={onQuickActionError}
        />
        <BarberOperationalArrivalTap
          row={row}
          pending={actions.arrivalBusyId === row.id}
          onAdvance={onAdvance}
          fullWidth={!dense}
          className={dense ? "w-full" : undefined}
        />
        <div className="flex w-full flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
          >
            <Link href={`/appointments/${row.id}/confirmation`}>Open</Link>
          </Button>
          {!dense ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
            >
              <Link href={`/appointments/${row.id}/check-in`}>Check-in</Link>
            </Button>
          ) : null}
        </div>

        {!dense && canSendReminder ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full min-h-11 touch-manipulation sm:min-h-9"
            pending={actions.reminderBusyId === row.id}
            onClick={() => onReminder(row)}
          >
            {actions.reminderSentId === row.id
              ? "Reminder sent"
              : "Send reminder"}
          </Button>
        ) : null}

        {!dense && canMutate ? (
          <div className="flex w-full gap-2">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
            >
              <Link href={`/appointments/${row.id}/reschedule`}>
                Reschedule
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              pending={actions.cancelBusyId === row.id}
              className="min-h-11 flex-1 touch-manipulation sm:min-h-9"
              onClick={() => onCancel(row)}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
