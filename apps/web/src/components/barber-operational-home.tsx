"use client";

import { BarberOperationalAppointmentCard } from "@/components/barber-operational/barber-operational-appointment-card";
import { BarberOperationalDock } from "@/components/barber-operational/barber-operational-dock";
import { BarberOperationalNowCard } from "@/components/barber-operational/barber-operational-now-card";
import { BarberOperationalReferencesStrip } from "@/components/barber-operational/barber-operational-references-strip";
import { BarberOperationalSection } from "@/components/barber-operational/barber-operational-section";
import { PresencePanel } from "@/components/presence";
import { ScheduleRowsSkeleton } from "@/components/loading";
import { RunningLateCalmNotice } from "@/components/operational/running-late-calm-notice";
import { ShopLiveStatusBanner } from "@/components/shop-live-status-banner";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  buildReferencePreviews,
  formatStart,
  localYmd,
  pickNowFocus,
  splitTodayAndLater,
} from "@/lib/barber-operational-home";
import {
  buildOperationalArrivalDigest,
  countFloorPresence,
  floorPresenceGuests,
  OPERATIONAL_PRESENCE_POLL_MS,
} from "@/lib/operational-presence";
import {
  buildLiveShopSummary,
  sortTodayConfirmedQueue,
} from "@/lib/shop-live-status";
import type { ProfileState } from "@/lib/use-session-profile";
import {
  ApiError,
  cancelAppointment,
  fetchAppointmentHairProfile,
  fetchMyAppointments,
  sendAppointmentReminder,
  sendAppointmentRunningLate,
  updateAppointmentArrival,
} from "@ozilcuts/api";
import type {
  AppointmentArrivalState,
  AppointmentRecord,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  cn,
} from "@ozilcuts/ui";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReadyProfile = Extract<ProfileState, { kind: "ready" }>;

export function BarberOperationalHome({ profile }: { profile: ReadyProfile }) {
  const user = profile.user;
  const [rows, setRows] = useState<AppointmentRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [thumbs, setThumbs] = useState<Record<number, string | null>>({});
  const [cancelBusyId, setCancelBusyId] = useState<number | null>(null);
  const [reminderBusyId, setReminderBusyId] = useState<number | null>(null);
  const [reminderSentId, setReminderSentId] = useState<number | null>(null);
  const [lateBusyId, setLateBusyId] = useState<number | null>(null);
  const [lateSentId, setLateSentId] = useState<number | null>(null);
  const [arrivalBusyId, setArrivalBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [presenceDigest, setPresenceDigest] = useState<string | null>(null);
  const [digestShownAtMs, setDigestShownAtMs] = useState<number | null>(null);
  const [barberSessionReady, setBarberSessionReady] = useState(true);
  const rowsRef = useRef<AppointmentRecord[] | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") setNowTick(Date.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const token = getStoredAuthToken();
    if (!token) {
      if (!silent) {
        setLoadError("Sign in required.");
        setRows([]);
      }
      return;
    }
    if (!silent) {
      setLoadError(null);
      setRows(null);
      setThumbs({});
    } else {
      setIsRefreshing(true);
    }
    try {
      const page = await fetchMyAppointments(token, {
        range: "upcoming",
        status: "confirmed",
        perPage: 60,
      });
      const nextRows = [...page.data].sort(
        (a, b) =>
          (a.starts_at ? new Date(a.starts_at).getTime() : 0) -
          (b.starts_at ? new Date(b.starts_at).getTime() : 0),
      );
      if (silent && rowsRef.current !== null) {
        const line = buildOperationalArrivalDigest(rowsRef.current, nextRows);
        if (line) {
          setPresenceDigest(line);
          setDigestShownAtMs(Date.now());
        }
      }
      setRows(nextRows);
      if (!silent) setLoadError(null);
    } catch (e) {
      if (!silent) {
        setRows([]);
        setLoadError(
          e instanceof ApiError ? e.message : "Could not load appointments.",
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void load({ silent: true });
    };
    const timer = window.setInterval(tick, OPERATIONAL_PRESENCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const { today, later } = useMemo(() => {
    if (!rows) return { today: [] as AppointmentRecord[], later: [] as AppointmentRecord[] };
    return splitTodayAndLater(rows);
  }, [rows]);

  const todayQueue = useMemo(
    () => sortTodayConfirmedQueue(rows ?? [], localYmd(new Date())),
    [rows],
  );

  const liveSummary = useMemo(
    () => buildLiveShopSummary(todayQueue, nowTick),
    [todayQueue, nowTick],
  );

  const nowFocus = useMemo(
    () => pickNowFocus(today, nowTick),
    [today, nowTick],
  );

  const presenceFloorCounts = useMemo(() => countFloorPresence(todayQueue), [todayQueue]);

  const presenceFloorGuests = useMemo(
    () => floorPresenceGuests(todayQueue),
    [todayQueue],
  );

  const refTargetIds = useMemo(() => {
    const out: number[] = [];
    const seen = new Set<number>();
    for (const r of [...today, ...later]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(r.id);
      }
    }
    return out.slice(0, 12);
  }, [today, later]);

  useEffect(() => {
    if (refTargetIds.length === 0) return;
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    void Promise.all(
      refTargetIds.map(async (id) => {
        try {
          const res = await fetchAppointmentHairProfile(token, id);
          return { id, url: res.data?.photos?.[0]?.url ?? null } as const;
        } catch {
          return { id, url: null as string | null } as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setThumbs((prev) => {
        const next = { ...prev };
        for (const { id, url } of pairs) next[id] = url;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [refTargetIds]);

  const references = useMemo(
    () => buildReferencePreviews([...today, ...later], thumbs, 8),
    [today, later, thumbs],
  );

  const actionState = useMemo(
    () => ({
      cancelBusyId,
      reminderBusyId,
      reminderSentId,
      lateBusyId,
      lateSentId,
      arrivalBusyId,
    }),
    [
      cancelBusyId,
      reminderBusyId,
      reminderSentId,
      lateBusyId,
      lateSentId,
      arrivalBusyId,
    ],
  );

  async function onAdvanceArrival(
    row: AppointmentRecord,
    next: AppointmentArrivalState,
  ) {
    const token = getStoredAuthToken();
    if (!token) return;
    setArrivalBusyId(row.id);
    setActionError(null);
    setRows((prev) =>
      prev?.map((r) =>
        r.id === row.id ? { ...r, arrival_state: next } : r,
      ) ?? null,
    );
    try {
      await updateAppointmentArrival(token, row.id, {
        arrival_state: next,
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not update visit status.",
      );
      await load({ silent: true });
    } finally {
      setArrivalBusyId(null);
    }
  }

  async function onCancel(row: AppointmentRecord) {
    const ok = window.confirm(
      `Cancel ${row.service?.name ?? "this cut"} on ${formatStart(row.starts_at)}?`,
    );
    if (!ok) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setCancelBusyId(row.id);
    setActionError(null);
    try {
      await cancelAppointment(token, row.id);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not cancel. Try again.",
      );
    } finally {
      setCancelBusyId(null);
    }
  }

  async function onReminder(row: AppointmentRecord) {
    const token = getStoredAuthToken();
    if (!token) return;
    setReminderBusyId(row.id);
    setReminderSentId(null);
    setActionError(null);
    try {
      await sendAppointmentReminder(token, row.id);
      setReminderSentId(row.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not send reminder.",
      );
    } finally {
      setReminderBusyId(null);
    }
  }

  async function onRunningLate(row: AppointmentRecord, minutes: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    setLateBusyId(row.id);
    setLateSentId(null);
    setActionError(null);
    try {
      await sendAppointmentRunningLate(token, row.id, minutes);
      setLateSentId(row.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not notify customer.",
      );
    } finally {
      setLateBusyId(null);
    }
  }

  const todayWithoutFocus = useMemo(() => {
    if (!nowFocus) return today;
    return today.filter((r) => r.id !== nowFocus.id);
  }, [today, nowFocus]);

  return (
    <div
      className={cn(
        "motion-content-in space-y-8 md:space-y-9",
        isRefreshing && "optimistic-pending",
      )}
      aria-busy={isRefreshing || undefined}
    >
      <BarberOperationalDock />

      {rows !== null && !loadError ? (
        <PresencePanel
          userId={user.id}
          digestMessage={presenceDigest}
          digestShownAtMs={digestShownAtMs}
          onDismissDigest={() => {
            setPresenceDigest(null);
            setDigestShownAtMs(null);
          }}
          onReadyChange={setBarberSessionReady}
          floorCounts={presenceFloorCounts}
          floorGuests={presenceFloorGuests}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation"
        >
          <Link href="/barber/hours">
            <Clock className="mr-1.5 size-4" aria-hidden />
            Hours
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 touch-manipulation"
          onClick={() => void load()}
        >
          Refresh day
        </Button>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {rows === null ? <ScheduleRowsSkeleton rows={4} /> : null}

      {rows !== null && loadError ? (
        <Card className="border-destructive/35 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">Could not load schedule</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button type="button" onClick={() => void load()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {rows !== null && !loadError && todayQueue.length > 0 ? (
        <ShopLiveStatusBanner
          summary={liveSummary}
          barberPresenceNote={
            barberSessionReady
              ? "You are marked ready to seat the next guest."
              : "Focus mode — the floor still updates quietly in the background."
          }
        />
      ) : null}

      {rows !== null && !loadError && liveSummary.behindCount > 0 ? (
        <RunningLateCalmNotice mode="staff" visitsBehindSchedule={liveSummary.behindCount} />
      ) : null}

      {rows !== null && !loadError && nowFocus ? (
        <BarberOperationalNowCard
          row={nowFocus}
          user={user}
          thumb={thumbs[nowFocus.id] ?? null}
          nowMs={nowTick}
          liveSummary={liveSummary}
          arrivalBusy={arrivalBusyId === nowFocus.id}
          lateBusy={lateBusyId === nowFocus.id}
          lateSent={lateSentId === nowFocus.id}
          onRunningLate={onRunningLate}
          onQuickRefresh={() => void load({ silent: true })}
          onQuickActionError={(msg) => setActionError(msg)}
          onAdvance={onAdvanceArrival}
        />
      ) : null}

      {rows !== null && !loadError ? (
        <>
          <BarberOperationalReferencesStrip references={references} />

          <BarberOperationalSection
            id="barber-today-heading"
            title="Today's chair"
            badge={
              today.length > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {today.length}
                </span>
              ) : undefined
            }
          >
            {today.length === 0 ? (
              <EmptyState
                title="Clear today"
                description="No confirmed bookings on your calendar for today. Walk-ins live on Chair."
                className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-10"
                action={
                  <Button asChild className="min-h-11 touch-manipulation">
                    <Link href="/barber/calendar">Open Chair</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {todayWithoutFocus.map((row) => (
                  <li key={row.id}>
                    <BarberOperationalAppointmentCard
                      row={row}
                      user={user}
                      dense={false}
                      queue={todayQueue}
                      thumb={thumbs[row.id] ?? null}
                      nowMs={nowTick}
                      actions={actionState}
                      onCancel={onCancel}
                      onReminder={onReminder}
                      onRunningLate={onRunningLate}
                      onAdvance={onAdvanceArrival}
                      onRefreshAfterQuickPing={() => void load({ silent: true })}
                      onQuickActionError={(msg) => setActionError(msg)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </BarberOperationalSection>

          <BarberOperationalSection
            id="barber-queue-heading"
            title="Upcoming customers"
            badge={
              later.length > 0 ? (
                <span className="text-xs text-muted-foreground">Next days</span>
              ) : undefined
            }
          >
            {later.length === 0 ? (
              <Card className="dashboard-surface">
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Nothing queued after today — you&apos;re caught up on confirmed
                  bookings.
                </CardContent>
              </Card>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {later.map((row) => (
                  <li key={row.id}>
                    <BarberOperationalAppointmentCard
                      row={row}
                      user={user}
                      dense
                      queue={[]}
                      thumb={thumbs[row.id] ?? null}
                      nowMs={nowTick}
                      actions={actionState}
                      onCancel={onCancel}
                      onReminder={onReminder}
                      onRunningLate={onRunningLate}
                      onAdvance={onAdvanceArrival}
                      onRefreshAfterQuickPing={() => void load({ silent: true })}
                      onQuickActionError={(msg) => setActionError(msg)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </BarberOperationalSection>
        </>
      ) : null}
    </div>
  );
}
