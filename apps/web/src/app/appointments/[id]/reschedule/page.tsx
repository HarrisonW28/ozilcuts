"use client";

import { SiteHeader } from "@/components/site-header";
import { useShellPageChrome } from "@/lib/use-shell-page-chrome";
import { getStoredAuthToken } from "@/lib/auth-token";
import { reportFilterControlClass } from "@/lib/report-filter-classes";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchAppointment,
  fetchBarberSlots,
  rescheduleAppointment,
} from "@ozilcuts/api";
import type { AppointmentRecord } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; appointment: AppointmentRecord }
  | { kind: "error"; message: string };

type SlotsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; slots: string[] }
  | { kind: "error"; message: string };

function formatTimeFromIso(iso: string): string {
  const [, time] = iso.split("T");
  return (time ?? "").slice(0, 5);
}

function formatStart(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateOnlyFromIso(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ReschedulePage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params.id;
  const appointmentId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [date, setDate] = useState<string>(todayIso());
  const [slots, setSlots] = useState<SlotsState>({ kind: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAppointment = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      setState({ kind: "error", message: "Invalid appointment link." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const appt = await fetchAppointment(token, appointmentId);
      setState({ kind: "ok", appointment: appt });
      const initialDate = dateOnlyFromIso(appt.starts_at);
      if (initialDate) {
        setDate(initialDate);
      }
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load appointment.";
      setState({ kind: "error", message });
    }
  }, [appointmentId]);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    void loadAppointment();
  }, [profile, loadAppointment]);

  const appointment = state.kind === "ok" ? state.appointment : null;
  const serviceId = appointment?.service?.id ?? null;
  const barberId = appointment?.barber?.id ?? null;

  const loadSlots = useCallback(async () => {
    if (serviceId === null || barberId === null || !date) {
      setSlots({ kind: "idle" });
      return;
    }
    setSlots({ kind: "loading" });
    setSelectedSlot(null);
    try {
      const data = await fetchBarberSlots(barberId, serviceId, date, {
        excludeAppointmentId: appointmentId,
      });
      setSlots({ kind: "ok", slots: data.slots });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Unable to load times.";
      setSlots({ kind: "error", message });
    }
  }, [serviceId, barberId, date, appointmentId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const currentStartIso = useMemo(() => {
    if (!appointment?.starts_at) return null;
    const d = new Date(appointment.starts_at);
    if (Number.isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
  }, [appointment]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token || !appointment || !selectedSlot) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const updated = await rescheduleAppointment(token, appointment.id, {
        starts_at: selectedSlot,
      });
      router.push(
        `/appointments/${updated.id}/confirmation?just_rescheduled=1`,
      );
      return;
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setSubmitError(err.firstMessage() ?? "Validation failed.");
      } else if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Could not reschedule. Please try again.");
      }
    } finally {
      setSubmitBusy(false);
    }
  }

  const isReady = profile.kind === "ready";

  const { useCompactShellHeader } = useShellPageChrome();

  return (
    <>
      {!useCompactShellHeader ? (
        <SiteHeader profile={profile} onSignOut={signOut} />
      ) : null}
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-2xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Reschedule appointment"
            description="Pick a new open time. Your existing slot is shown as available so you can keep it if needed."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  You need to be signed in to reschedule an appointment.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && state.kind === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading appointment…
            </p>
          ) : null}

          {isReady && state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn’t load appointment</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/appointments">My appointments</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && state.kind === "ok" && appointment ? (
            <Card>
              <CardHeader>
                <CardTitle>{appointment.service?.name ?? "Service"}</CardTitle>
                <CardDescription>
                  Currently {formatStart(appointment.starts_at)}{" "}
                  {appointment.barber ? `with ${appointment.barber.name}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex min-w-0 flex-col gap-4" onSubmit={onSubmit}>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="r-date">New date</Label>
                    <input
                      id="r-date"
                      type="date"
                      min={todayIso()}
                      className={reportFilterControlClass}
                      value={date}
                      onChange={(ev) => setDate(ev.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>New time</Label>
                    {slots.kind === "idle" ? (
                      <p className="text-sm text-muted-foreground">
                        Pick a date to see open times.
                      </p>
                    ) : null}
                    {slots.kind === "loading" ? (
                      <p
                        className="text-sm text-muted-foreground"
                        role="status"
                      >
                        Loading times…
                      </p>
                    ) : null}
                    {slots.kind === "error" ? (
                      <p className="text-sm text-destructive" role="alert">
                        {slots.message}
                      </p>
                    ) : null}
                    {slots.kind === "ok" && slots.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No openings on this day. Try another date.
                      </p>
                    ) : null}
                    {slots.kind === "ok" && slots.slots.length > 0 ? (
                      <div
                        role="radiogroup"
                        aria-label="Available times"
                        className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap"
                      >
                        {slots.slots.map((slot) => {
                          const checked = selectedSlot === slot;
                          const isCurrent = slot === currentStartIso;
                          return (
                            <button
                              key={slot}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              aria-label={`${formatTimeFromIso(slot)}${isCurrent ? " (current)" : ""}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={
                                checked
                                  ? "min-h-11 rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground sm:min-h-9"
                                  : isCurrent
                                    ? "min-h-11 rounded-md border border-primary/50 bg-primary/10 px-3 text-sm text-foreground hover:bg-primary/20 sm:min-h-9"
                                    : "min-h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/60 sm:min-h-9"
                              }
                            >
                              {formatTimeFromIso(slot)}
                              {isCurrent ? " · current" : ""}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {submitError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={submitBusy || selectedSlot === null}
                    >
                      {submitBusy ? "Saving…" : "Save new time"}
                    </Button>
                    <Button asChild type="button" variant="outline">
                      <Link href="/appointments">Cancel</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/appointments"
              className="underline-offset-4 hover:underline"
            >
              Back to appointments
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
