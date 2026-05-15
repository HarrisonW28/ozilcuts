"use client";

import {
  approveAppointmentAdjustmentRequest,
  createAppointmentAdjustmentRequest,
  fetchAppointmentAdjustmentRequest,
  fetchAppointmentAdjustmentSuggestions,
  rejectAppointmentAdjustmentRequest,
  withdrawAppointmentAdjustmentRequest,
} from "@ozilcuts/api";
import type {
  AppointmentAdjustmentRequestRecord,
  AppointmentAdjustmentSuggestion,
  AppointmentRecord,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdjustmentNearbySuggestions } from "./adjustment-nearby-suggestions";
import { AdjustmentPanelSkeleton } from "./adjustment-panel-skeleton";
import { AdjustmentPendingCard } from "./adjustment-pending-card";
import { AdjustmentSlotsRefreshBlock } from "./adjustment-slots-refresh-block";
import { formatAdjustmentWhen } from "./format-adjustment";

type PanelState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function AppointmentAdjustmentPanel(props: {
  appointment: AppointmentRecord;
  token: string;
  canRequest: boolean;
  rescheduleHref: string;
  onAppointmentUpdated: (row: AppointmentRecord) => void;
}) {
  const {
    appointment,
    token,
    canRequest,
    rescheduleHref,
    onAppointmentUpdated,
  } = props;

  const [panelState, setPanelState] = useState<PanelState>({ kind: "loading" });
  const [suggestions, setSuggestions] = useState<AppointmentAdjustmentSuggestion[]>(
    [],
  );
  const [pending, setPending] = useState<AppointmentAdjustmentRequestRecord | null>(
    null,
  );
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** After approve, suggestions refetch for the new start time — avoid flashing old chips. */
  const [slotsRefreshAfterApprove, setSlotsRefreshAfterApprove] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setPanelState({ kind: "loading" });
      }
      if (!opts?.silent) {
        setActionError(null);
      }
      try {
        const [sug, req] = await Promise.all([
          fetchAppointmentAdjustmentSuggestions(token, appointment.id),
          fetchAppointmentAdjustmentRequest(token, appointment.id),
        ]);
        setSuggestions(sug.suggestions);
        setPending(req.request);
        setPanelState({ kind: "ok" });
      } catch (e: unknown) {
        if (opts?.silent) {
          return;
        }
        const message =
          e instanceof Error ? e.message : "Could not load move options.";
        setPanelState({ kind: "error", message });
      }
    },
    [appointment.id, token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const requestMove = async (startsAt: string) => {
    if (!canRequest || acting) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await createAppointmentAdjustmentRequest(
        token,
        appointment.id,
        startsAt,
      );
      setPending(res.request);
      await load({ silent: true });
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : "Could not send move request.",
      );
    } finally {
      setActing(false);
    }
  };

  const approve = async () => {
    if (!pending?.can_respond || acting) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await approveAppointmentAdjustmentRequest(
        token,
        appointment.id,
      );
      setPending(null);
      onAppointmentUpdated(res.appointment);
      setSlotsRefreshAfterApprove(true);
      await load({ silent: true });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Could not approve move.");
    } finally {
      setSlotsRefreshAfterApprove(false);
      setActing(false);
    }
  };

  const reject = async () => {
    if (!pending?.can_respond || acting) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await rejectAppointmentAdjustmentRequest(
        token,
        appointment.id,
      );
      setPending(res.request);
      await load({ silent: true });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Could not reject move.");
    } finally {
      setActing(false);
    }
  };

  const withdraw = async () => {
    if (!pending?.can_withdraw || acting) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await withdrawAppointmentAdjustmentRequest(
        token,
        appointment.id,
      );
      setPending(res.request);
      await load({ silent: true });
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : "Could not withdraw request.",
      );
    } finally {
      setActing(false);
    }
  };

  if (appointment.status !== "confirmed") {
    return null;
  }

  return (
    <Card
      size="sm"
      className="dashboard-surface border-border/50 shadow-sm dark:border-border/40"
    >
      <CardHeader className="space-y-1.5 pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Quick move
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          Nudge to a nearby time in one tap. The other person confirms here —
          skip the full reschedule flow when you only need a small shift.
          Current time:{" "}
          <span className="font-medium text-foreground">
            {formatAdjustmentWhen(appointment.starts_at)}
          </span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {panelState.kind === "loading" ? <AdjustmentPanelSkeleton /> : null}

        {panelState.kind === "error" ? (
          <div
            className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 dark:bg-destructive/10"
            role="alert"
          >
            <p className="text-sm text-destructive">{panelState.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:w-auto"
              onClick={() => void load()}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        {panelState.kind === "ok" && pending ? (
          <AdjustmentPendingCard
            pending={pending}
            acting={acting}
            onApprove={() => void approve()}
            onReject={() => void reject()}
            onWithdraw={() => void withdraw()}
          />
        ) : null}

        {panelState.kind === "ok" && canRequest && !pending ? (
          <section aria-label="Nearby time suggestions">
            {slotsRefreshAfterApprove ? (
              <AdjustmentSlotsRefreshBlock />
            ) : (
              <AdjustmentNearbySuggestions
                suggestions={suggestions}
                acting={acting}
                rescheduleHref={rescheduleHref}
                onPick={(startsAt) => void requestMove(startsAt)}
              />
            )}
          </section>
        ) : null}

        {panelState.kind === "ok" && !canRequest && !pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Quick move isn&apos;t available for this booking from here.
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Bigger change (date, barber, service)?{" "}
          <Link
            href={rescheduleHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open full reschedule
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
