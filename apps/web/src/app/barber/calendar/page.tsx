"use client";

import { SiteHeader } from "@/components/site-header";
import { BarberDailyOverview } from "@/components/barber-daily-overview";
import { BarberWalkInPanel } from "@/components/barber-walk-in-panel";
import { DayTimelineCalendar } from "@/components/day-timeline-calendar";
import { OperationalLoadingBlock } from "@/components/operational-loading-block";
import { WeekAvailabilityCalendar } from "@/components/week-availability-calendar";
import type { CalendarDensity } from "@/lib/calendar-week";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  addDays,
  applyBookingsToSchedule,
  buildWeekDaysFromAvailability,
  formatMonthDay,
  formatShortWeekday,
  formatWeekRangeLabel,
  formatYmd,
  isSameYmd,
  parseYmdToDate,
  startOfWeekSunday,
} from "@/lib/calendar-week";
import { useOperationalWorkspaceMode } from "@/lib/operational-workspace-context";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchManageBarberAvailability,
  fetchMyAppointments,
} from "@ozilcuts/api";
import type {
  AppointmentRecord,
  BarberAvailabilityPayload,
} from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const DENSITY_STORAGE_KEY = "ozilcuts_calendar_density";

function loadStoredDensity(): CalendarDensity {
  if (typeof window === "undefined") return "comfortable";
  const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return raw === "compact" ? "compact" : "comfortable";
}

export default function BarberCalendarPage() {
  const { profile, signOut } = useSessionProfile();
  const { isFocused } = useOperationalWorkspaceMode();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekSunday(new Date()),
  );
  const [availability, setAvailability] =
    useState<BarberAvailabilityPayload | null>(null);
  const [bookings, setBookings] = useState<AppointmentRecord[]>([]);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [density, setDensity] = useState<CalendarDensity>("comfortable");
  const [focusedDate, setFocusedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  useEffect(() => {
    setDensity(loadStoredDensity());
  }, []);

  const onDensityChange = useCallback((next: CalendarDensity) => {
    setDensity(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    }
  }, []);

  const userId = profile.kind === "ready" ? profile.user.id : null;
  const weekLabel = formatWeekRangeLabel(weekStart);
  const weekFromYmd = formatYmd(weekStart);
  const weekToYmd = formatYmd(addDays(weekStart, 6));
  const calendarDays = useMemo(
    () =>
      applyBookingsToSchedule(
        buildWeekDaysFromAvailability(weekStart, availability),
        bookings,
      ),
    [weekStart, availability, bookings],
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const token = getStoredAuthToken();
    if (!token || userId === null) {
      if (!silent) {
        setLoadState("error");
        setLoadMessage("Sign in required.");
      }

      return;
    }
    if (!silent) {
      setLoadState("loading");
      setLoadMessage(null);
    }
    try {
      const [availabilityPayload, appointmentsPage] = await Promise.all([
        fetchManageBarberAvailability(token, userId),
        // Range query returns a wide per_page, so a single request covers
        // every booking in the visible week without paginating.
        fetchMyAppointments(token, {
          from: weekFromYmd,
          to: weekToYmd,
          status: "confirmed",
        }),
      ]);
      setAvailability(availabilityPayload);
      setBookings(appointmentsPage.data);
      setLoadState("ok");
    } catch (e: unknown) {
      if (!silent) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to load.";
        setLoadState("error");
        setLoadMessage(message);
      }
    }
  }, [userId, weekFromYmd, weekToYmd]);

  useEffect(() => {
    if (profile.kind !== "ready" || profile.user.role.slug !== "barber") {
      return;
    }
    void load();
  }, [profile, load]);

  const isBarber =
    profile.kind === "ready" && profile.user.role.slug === "barber";

  /** Soft refresh while today is in view — keeps walk-ins and desk changes near-real-time. */
  useEffect(() => {
    if (!isBarber || loadState !== "ok") return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!isSameYmd(focusedDate, today)) return;

    const run = () => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    };
    const id = window.setInterval(run, 60_000);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [isBarber, loadState, focusedDate, load]);

  // When the visible week changes, snap the focused day into that week
  // (preferring today if it lives in the new week, otherwise its
  // Sunday).
  useEffect(() => {
    const weekEnd = addDays(weekStart, 6);
    if (focusedDate < weekStart || focusedDate > weekEnd) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInWeek = today >= weekStart && today <= weekEnd;
      setFocusedDate(todayInWeek ? today : new Date(weekStart));
    }
  }, [weekStart, focusedDate]);

  // Keyboard nav: ←/→ for prev/next week, T jumps to "this week". We
  // ignore key events originating in form fields so users can still
  // type into the jump-to-date picker.
  useEffect(() => {
    if (!isBarber) return;
    const isFormElement = (el: EventTarget | null) =>
      el instanceof HTMLElement
      && (el.tagName === "INPUT"
        || el.tagName === "TEXTAREA"
        || el.tagName === "SELECT"
        || el.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFormElement(e.target)) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setWeekStart((w) => addDays(w, -7));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setWeekStart((w) => addDays(w, 7));
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setWeekStart(startOfWeekSunday(new Date()));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBarber]);

  const focusedDaySchedule = useMemo(() => {
    return (
      calendarDays.find((d) => isSameYmd(d.date, focusedDate)) ?? calendarDays[0]
    );
  }, [calendarDays, focusedDate]);

  const shiftFocusedDay = useCallback(
    (deltaDays: number) => {
      const next = addDays(focusedDate, deltaDays);
      next.setHours(0, 0, 0, 0);
      const weekEnd = addDays(weekStart, 6);
      weekEnd.setHours(0, 0, 0, 0);
      if (next < weekStart || next > weekEnd) {
        setWeekStart(startOfWeekSunday(next));
      }
      setFocusedDate(next);
    },
    [focusedDate, weekStart],
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Chair"
            description={
              isFocused
                ? "Your runway for the selected day — scroll the timeline, tap a booking to open it."
                : "Day timeline first, walk-in below — tap a day to switch, pinch-friendly controls."
            }
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              Session issue. Sign in again.
            </p>
          ) : null}

          {profile.kind === "ready" && !isBarber ? (
            <Card>
              <CardHeader>
                <CardTitle>Barbers only</CardTitle>
                <CardDescription>
                  Sign in with a barber account to view your calendar.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isBarber ? (
            <>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div
                    className="flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label="Week navigation"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 touch-manipulation sm:min-h-9"
                      onClick={() => setWeekStart((w) => addDays(w, -7))}
                      aria-keyshortcuts="ArrowLeft"
                      title="Previous week (←)"
                    >
                      Previous week
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 touch-manipulation sm:min-h-9"
                      onClick={() =>
                        setWeekStart(startOfWeekSunday(new Date()))
                      }
                      aria-keyshortcuts="t"
                      title="This week (T)"
                    >
                      This week
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 touch-manipulation sm:min-h-9"
                      onClick={() => setWeekStart((w) => addDays(w, 7))}
                      aria-keyshortcuts="ArrowRight"
                      title="Next week (→)"
                    >
                      Next week
                    </Button>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-foreground">
                    {weekLabel}
                  </p>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto sm:ml-auto"
                  >
                    <Link href="/barber/hours">Edit hours</Link>
                  </Button>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
                  <div className="flex w-full items-stretch gap-2 lg:max-w-2xl">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="Previous day"
                      onClick={() => shiftFocusedDay(-1)}
                    >
                      <span aria-hidden className="text-lg leading-none">
                        ‹
                      </span>
                    </Button>
                    <div className="-mx-1 min-h-0 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex min-w-min gap-2 pb-1 pt-0.5">
                        {calendarDays.map((d) => {
                          const selected = isSameYmd(d.date, focusedDate);
                          const today = isSameYmd(d.date, new Date());
                          const count = d.bookings.length;

                          return (
                            <button
                              key={d.date.toISOString()}
                              type="button"
                              onClick={() => setFocusedDate(d.date)}
                              aria-pressed={selected}
                              className={cn(
                                "motion-interactive min-w-[4.5rem] shrink-0 snap-start rounded-2xl border px-3 py-2.5 text-left transition-[background-color,box-shadow,border-color] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)] sm:min-w-[5.25rem]",
                                "touch-manipulation active:scale-[0.98]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                selected
                                  ? "border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                  : "border-border/60 bg-card/30 hover:border-border hover:bg-muted/30",
                                today && !selected
                                  ? "ring-1 ring-primary/25"
                                  : null,
                              )}
                            >
                              <span
                                className={cn(
                                  "block text-[10px] font-semibold uppercase tracking-wide",
                                  today ? "text-primary" : "text-muted-foreground",
                                )}
                              >
                                {formatShortWeekday(d.date)}
                              </span>
                              <span className="mt-0.5 block text-sm font-semibold leading-tight text-foreground">
                                {formatMonthDay(d.date)}
                              </span>
                              <span className="mt-1.5 block text-[10px] text-muted-foreground tabular-nums">
                                {count === 0
                                  ? "Open"
                                  : `${count} appt${count === 1 ? "" : "s"}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 shrink-0 touch-manipulation sm:size-10"
                      aria-label="Next day"
                      onClick={() => shiftFocusedDay(1)}
                    >
                      <span aria-hidden className="text-lg leading-none">
                        ›
                      </span>
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0">Jump to</span>
                      <input
                        type="date"
                        value={formatYmd(focusedDate)}
                        onChange={(e) => {
                          const next = parseYmdToDate(e.target.value);
                          if (!next) return;
                          setFocusedDate(next);
                          setWeekStart(startOfWeekSunday(next));
                        }}
                        className="motion-interactive min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:w-auto"
                        aria-label="Jump to date"
                      />
                    </label>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2",
                        isFocused && "hidden",
                      )}
                      role="group"
                      aria-label="Calendar density"
                    >
                      <span className="text-sm text-muted-foreground">
                        Zoom
                      </span>
                      <Button
                        type="button"
                        variant={
                          density === "comfortable" ? "default" : "outline"
                        }
                        size="sm"
                        className="min-h-11 touch-manipulation sm:min-h-9"
                        aria-pressed={density === "comfortable"}
                        onClick={() => onDensityChange("comfortable")}
                      >
                        Standard
                      </Button>
                      <Button
                        type="button"
                        variant={density === "compact" ? "default" : "outline"}
                        size="sm"
                        className="min-h-11 touch-manipulation sm:min-h-9"
                        aria-pressed={density === "compact"}
                        onClick={() => onDensityChange("compact")}
                      >
                        Compact
                      </Button>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-xs text-muted-foreground lg:w-full lg:text-right",
                      isFocused && "hidden",
                    )}
                    aria-live="polite"
                  >
                    <span className="whitespace-nowrap">
                      ← / → week · T today · Tap a block to open
                    </span>
                  </p>
                </div>
              </div>

              {loadState === "loading" || loadState === "idle" ? (
                <OperationalLoadingBlock
                  label="Loading your chair"
                  variant="chair"
                />
              ) : null}
              {loadState === "error" ? (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
                  <p className="text-sm text-destructive">
                    {loadMessage ?? "Error"}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => void load()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              {loadState === "ok" && focusedDaySchedule ? (
                <>
                  <section
                    className="space-y-5"
                    aria-label="Chair — day timeline"
                  >
                    <BarberDailyOverview
                      day={focusedDate}
                      appointments={bookings}
                    />
                    <DayTimelineCalendar
                      day={focusedDaySchedule}
                      className="shadow-md"
                      density={density}
                    />
                  </section>

                  <BarberWalkInPanel
                    barberUserId={userId ?? 0}
                    focusedDateYmd={formatYmd(focusedDate)}
                    onBooked={() => void load()}
                  />

                  <div
                    className={cn(
                      isFocused ? "hidden" : "hidden lg:block",
                    )}
                  >
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Week overview
                    </h3>
                    <WeekAvailabilityCalendar
                      weekLabel={weekLabel}
                      days={calendarDays}
                      className="rounded-2xl border border-border/40 bg-card/20 p-4 sm:p-5"
                      focusedDate={focusedDate}
                      onDayFocus={setFocusedDate}
                      density={density}
                    />
                    <p className="mt-3 text-center text-xs text-muted-foreground lg:text-left">
                      Light areas: hours on · Cards: confirmed — tap to open.
                    </p>
                  </div>
                </>
              ) : null}

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
