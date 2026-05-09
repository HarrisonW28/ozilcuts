"use client";

import { SiteHeader } from "@/components/site-header";
import { WeekAvailabilityCalendar } from "@/components/week-availability-calendar";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  addDays,
  applyBookingsToSchedule,
  buildWeekDaysFromAvailability,
  formatWeekRangeLabel,
  formatYmd,
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
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekStart((w) => addDays(w, -7))}
                  >
                    Previous week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekStart(startOfWeekSunday(new Date()))}
                  >
                    This week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekStart((w) => addDays(w, 7))}
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
                <WeekAvailabilityCalendar
                  weekLabel={weekLabel}
                  days={calendarDays}
                  className="rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6"
                />
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
