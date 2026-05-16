"use client";

import { buildBookFromAppointmentRow } from "@/lib/booking-url";
import { canSendRunningLateNotice } from "@/lib/barber-operational-home";
import { getStoredAuthToken } from "@/lib/auth-token";
import { ApiError, postAppointmentThreadMessage } from "@ozilcuts/api";
import type { AppointmentRecord, AuthUser } from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";
import {
  Armchair,
  CalendarPlus,
  ChevronDown,
  Clock,
  MessageSquareText,
  SquareCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

export type BarberOperationalOneTapStripProps = {
  row: AppointmentRecord;
  user: AuthUser;
  variant: "comfortable" | "compact";
  lateBusy: boolean;
  lateSent: boolean;
  onRunningLate: (
    row: AppointmentRecord,
    minutes: number,
  ) => void | Promise<void>;
  onChairReadyDone?: () => void;
  onActionError?: (message: string) => void;
};

export function BarberOperationalOneTapStrip({
  row,
  user,
  variant,
  lateBusy,
  lateSent,
  onRunningLate,
  onChairReadyDone,
  onActionError,
}: BarberOperationalOneTapStripProps) {
  const [chairPingBusy, setChairPingBusy] = useState(false);
  const canLate = canSendRunningLateNotice(row, user);
  const rebookHref = buildBookFromAppointmentRow(row);
  const confirmationHref = `/appointments/${row.id}/confirmation`;

  const sendChairReady = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      onActionError?.("Sign in required.");
      return;
    }
    setChairPingBusy(true);
    try {
      await postAppointmentThreadMessage(token, row.id, {
        kind: "operational",
        operational_key: "chair_ready",
      });
      onChairReadyDone?.();
    } catch (err) {
      onActionError?.(
        err instanceof ApiError
          ? err.message
          : "Could not send chair-ready message.",
      );
    } finally {
      setChairPingBusy(false);
    }
  }, [onActionError, onChairReadyDone, row.id]);

  const comfortable = variant === "comfortable";
  const gridClass = comfortable
    ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
    : "grid grid-cols-2 gap-1.5";

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/[0.04] p-2 dark:border-primary/25 dark:bg-primary/[0.06]",
        comfortable ? "sm:p-2.5" : "p-1.5",
      )}
    >
      <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        One tap
      </p>
      <div className={gridClass}>
        <Button
          type="button"
          size={comfortable ? "default" : "sm"}
          variant="secondary"
          className={cn(
            "min-h-11 touch-manipulation gap-1.5",
            !comfortable && "h-auto min-h-10 px-2 text-[11px]",
            comfortable && "min-h-12 sm:text-sm",
          )}
          pending={chairPingBusy}
          aria-label="Send chair is ready message to guest"
          onClick={() => void sendChairReady()}
        >
          <Armchair className="size-4 shrink-0 opacity-90" aria-hidden />
          Chair ready
        </Button>

        {canLate ? (
          <Button
            type="button"
            size={comfortable ? "default" : "sm"}
            variant="outline"
            className={cn(
              "min-h-11 touch-manipulation gap-1.5",
              !comfortable && "h-auto min-h-10 px-2 text-[11px]",
              comfortable && "min-h-12 sm:text-sm",
            )}
            pending={lateBusy}
            aria-label="Notify guest you are running about 10 minutes late"
            onClick={() => void onRunningLate(row, 10)}
          >
            <Clock className="size-4 shrink-0 opacity-90" aria-hidden />
            {lateSent ? "Late · sent" : "Late · 10m"}
          </Button>
        ) : comfortable ? (
          <Button
            type="button"
            size="default"
            variant="outline"
            disabled
            className="min-h-12 touch-manipulation opacity-50"
          >
            <Clock className="size-4 shrink-0" aria-hidden />
            Late
          </Button>
        ) : null}

        <Button
          asChild
          size={comfortable ? "default" : "sm"}
          variant="outline"
          className={cn(
            "min-h-11 touch-manipulation gap-1.5",
            !comfortable && "h-auto min-h-10 px-2 text-[11px]",
            comfortable && "min-h-12 sm:text-sm",
          )}
        >
          <Link
            href={`${confirmationHref}#visit-thread`}
            aria-label="Open visit thread to send a quick note"
          >
            <MessageSquareText className="size-4 shrink-0 opacity-90" aria-hidden />
            Note
          </Link>
        </Button>

        <Button
          asChild
          size={comfortable ? "default" : "sm"}
          variant="default"
          className={cn(
            "min-h-11 touch-manipulation gap-1.5",
            !comfortable && "h-auto min-h-10 px-2 text-[11px]",
            comfortable && "min-h-12 sm:text-sm",
          )}
        >
          <Link
            href={`${confirmationHref}#visit-wrap-up`}
            aria-label="Open wrap-up: payment and visit summary"
          >
            <SquareCheck className="size-4 shrink-0 opacity-95" aria-hidden />
            Finish
          </Link>
        </Button>

        {rebookHref ? (
          <Button
            asChild
            size={comfortable ? "default" : "sm"}
            variant="outline"
            className={cn(
              "min-h-11 touch-manipulation gap-1.5 sm:col-span-2 sm:max-w-none",
              !comfortable && "col-span-2 h-auto min-h-10 px-2 text-[11px]",
              comfortable && "min-h-12 sm:col-span-1 sm:text-sm",
            )}
          >
            <Link href={rebookHref} aria-label="Book this guest again, express flow">
              <CalendarPlus className="size-4 shrink-0 opacity-90" aria-hidden />
              Book again
            </Link>
          </Button>
        ) : null}
      </div>

      {canLate && !comfortable ? (
        <div className="mt-1.5 flex gap-1.5">
          {[15, 20].map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 min-h-9 flex-1 touch-manipulation px-1 text-[10px] font-medium leading-tight"
              pending={lateBusy}
              aria-label={`Notify guest running about ${m} minutes late`}
              onClick={() => void onRunningLate(row, m)}
            >
              +{m}m late
            </Button>
          ))}
        </div>
      ) : null}

      {canLate && comfortable ? (
        <details className="mt-2 border-t border-border/35 pt-2 dark:border-border/30">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-1 text-caption font-medium text-muted-foreground",
              "marker:content-none [&::-webkit-details-marker]:hidden",
            )}
          >
            <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
            Other late times (+15 · +20)
          </summary>
          <div className="mt-2 flex gap-2">
            {[15, 20].map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-10 flex-1 touch-manipulation text-caption"
                pending={lateBusy}
                aria-label={`Notify guest running about ${m} minutes late`}
                onClick={() => void onRunningLate(row, m)}
              >
                +{m}m
              </Button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
