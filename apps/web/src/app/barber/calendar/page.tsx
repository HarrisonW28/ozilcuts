"use client";

import { SiteHeader } from "@/components/site-header";
import { WeekAvailabilityCalendar } from "@/components/week-availability-calendar";
import type { CalendarDensity } from "@/components/week-availability-calendar";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  addDays,
  applyBookingsToSchedule,
  buildWeekDaysFromAvailability,
  formatWeekRangeLabel,
  formatYmd,
  isSameYmd,
  parseYmdToDate,
  startOfWeekSunday,
} from "@/lib/calendar-week";
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
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const DENSITY_STORAGE_KEY = "ozilcuts_calendar_density";

function loadStoredDensity(): CalendarDensity {
  if (typeof window === "undefined") return "comfortable";
  const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return raw === "compact" ? "compact" : "comfortable";
}

function formatTimeOfDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFocusedDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function BarberCalendarPage() {
  const { profile, signOut } = useSessionProfile();
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

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token || userId === null) {
      setLoadState("error");
      setLoadMessage("Sign in required.");

      return;
    }
    setLoadState("loading");
    setLoadMessage(null);
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
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load.";
      setLoadState("error");
      setLoadMessage(message);
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

  const focusedDayBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (!b.starts_at) return false;
        const start = new Date(b.starts_at);
        return !Number.isNaN(start.getTime()) && isSameYmd(start, focusedDate);
      })
      .sort((a, b) =>
        (a.starts_at ?? "").localeCompare(b.starts_at ?? ""),
      );
  }, [bookings, focusedDate]);

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
            title="Calendar"
            description="Week view of your recurring hours and confirmed bookings."
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div
                    className="flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label="Week navigation"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      onClick={() => setWeekStart((w) => addDays(w, 7))}
                      aria-keyshortcuts="ArrowRight"
                      title="Next week (→)"
                    >
                      Next week
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {weekLabel}
                  </p>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="sm:ml-auto"
                  >
                    <Link href="/barber/hours">Edit hours</Link>
                  </Button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    Jump to:
                    <input
                      type="date"
                      value={formatYmd(focusedDate)}
                      onChange={(e) => {
                        const next = parseYmdToDate(e.target.value);
                        if (!next) return;
                        setFocusedDate(next);
                        setWeekStart(startOfWeekSunday(next));
                      }}
                      className="motion-interactive rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Jump to date"
                    />
                  </label>
                  <div
                    className="flex items-center gap-2 text-sm"
                    role="group"
                    aria-label="Calendar density"
                  >
                    <span className="text-muted-foreground">Density:</span>
                    <Button
                      type="button"
                      variant={
                        density === "comfortable" ? "default" : "outline"
                      }
                      size="sm"
                      aria-pressed={density === "comfortable"}
                      onClick={() => onDensityChange("comfortable")}
                    >
                      Comfortable
                    </Button>
                    <Button
                      type="button"
                      variant={density === "compact" ? "default" : "outline"}
                      size="sm"
                      aria-pressed={density === "compact"}
                      onClick={() => onDensityChange("compact")}
                    >
                      Compact
                    </Button>
                  </div>
                  <p
                    className="text-xs text-muted-foreground sm:ml-auto"
                    aria-live="polite"
                  >
                    Tip: ← / → to change week, T for today.
                  </p>
                </div>
              </div>

              {loadState === "loading" || loadState === "idle" ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Loading schedule…
                </p>
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
              {loadState === "ok" ? (
                <>
                  <WeekAvailabilityCalendar
                    weekLabel={weekLabel}
                    days={calendarDays}
                    className="rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6"
                    focusedDate={focusedDate}
                    onDayFocus={setFocusedDate}
                    density={density}
                  />

                  <Card>
                    <CardHeader>
                      <CardTitle>{formatFocusedDayLabel(focusedDate)}</CardTitle>
                      <CardDescription>
                        {focusedDayBookings.length === 0
                          ? "No confirmed bookings on this day."
                          : `${focusedDayBookings.length} confirmed ${
                              focusedDayBookings.length === 1
                                ? "booking"
                                : "bookings"
                            }, sorted by start time.`}
                      </CardDescription>
                    </CardHeader>
                    {focusedDayBookings.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {focusedDayBookings.map((b) => (
                          <li key={b.id} className="px-6 py-3">
                            <Link
                              href={`/appointments/${b.id}/confirmation`}
                              className="motion-interactive flex flex-col gap-1 rounded-md p-1 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {b.service?.name ?? "Appointment"}
                                {b.customer?.name ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {b.customer.name}
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeOfDay(b.starts_at)} –{" "}
                                {formatTimeOfDay(b.ends_at)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Card>
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
