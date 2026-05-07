"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  createAppointment,
  fetchBarberSlots,
  fetchBarbers,
  fetchServices,
} from "@ozilcuts/api";
import type {
  BarberProfilePublic,
  ServiceSummary,
} from "@ozilcuts/types";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${m}-${day}`;
}

function formatTimeFromIso(iso: string): string {
  const [, time] = iso.split("T");
  return (time ?? "").slice(0, 5);
}

type CatalogState =
  | { kind: "loading" }
  | { kind: "ok"; services: ServiceSummary[]; barbers: BarberProfilePublic[] }
  | { kind: "error"; message: string };

type SlotsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; slots: string[] }
  | { kind: "error"; message: string };

function parsePositiveIntParam(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseIsoDateParam(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value < fallback ? fallback : value;
}

function BookingFlow() {
  const search = useSearchParams();
  const router = useRouter();
  const today = todayIso();
  // Read all prefill params once, on initial render. The booking page is the
  // landing target for "book again" links from confirmation/appointments.
  const initialServiceId =
    parsePositiveIntParam(search.get("service_id")) ??
    parsePositiveIntParam(search.get("service"));
  const initialBarberId =
    parsePositiveIntParam(search.get("barber_user_id")) ??
    parsePositiveIntParam(search.get("barber"));
  const initialDate = parseIsoDateParam(search.get("date"), today);

  const { profile, signOut } = useSessionProfile();

  const [catalog, setCatalog] = useState<CatalogState>({ kind: "loading" });
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId);
  const [barberId, setBarberId] = useState<number | null>(initialBarberId);
  const [date, setDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<SlotsState>({ kind: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [bookBusy, setBookBusy] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchServices(), fetchBarbers()])
      .then(([services, barbers]) => {
        if (cancelled) return;
        setCatalog({ kind: "ok", services, barbers });
        setServiceId((current) =>
          current !== null && services.some((s) => s.id === current)
            ? current
            : current !== null
              ? null
              : current,
        );
        setBarberId((current) =>
          current !== null && barbers.some((b) => b.barber.id === current)
            ? current
            : current !== null
              ? null
              : current,
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to load booking options.";
        setCatalog({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSlots = useCallback(async () => {
    if (serviceId === null || barberId === null || !date) {
      setSlots({ kind: "idle" });
      return;
    }
    setSlots({ kind: "loading" });
    setSelectedSlot(null);
    try {
      const data = await fetchBarberSlots(barberId, serviceId, date);
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
  }, [serviceId, barberId, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const selectedService = useMemo(() => {
    if (catalog.kind !== "ok" || serviceId === null) return null;
    return catalog.services.find((s) => s.id === serviceId) ?? null;
  }, [catalog, serviceId]);

  const selectedBarber = useMemo(() => {
    if (catalog.kind !== "ok" || barberId === null) return null;
    return catalog.barbers.find((b) => b.barber.id === barberId) ?? null;
  }, [catalog, barberId]);

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    if (serviceId === null || barberId === null || selectedSlot === null) {
      setBookError("Select a service, barber, and time.");

      return;
    }
    setBookBusy(true);
    setBookError(null);
    try {
      const booked = await createAppointment(token, {
        service_id: serviceId,
        barber_user_id: barberId,
        starts_at: selectedSlot,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
      router.push(`/appointments/${booked.id}/confirmation?just_booked=1`);
      return;
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setBookError(err.firstMessage() ?? "Validation failed.");
      } else if (err instanceof ApiError) {
        setBookError(err.message);
      } else {
        setBookError("Could not book. Please try again.");
      }
    } finally {
      setBookBusy(false);
    }
  }

  const isReady = profile.kind === "ready";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Book an appointment"
            description="Pick a service, choose your barber, and grab an open time."
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

          {isReady && profile.user.role.slug !== "customer" ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer accounts only</CardTitle>
                <CardDescription>
                  Booking is for customer accounts. Staff manage availability
                  from their own dashboard.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in to continue</CardTitle>
                <CardDescription>
                  You need an account to confirm a booking.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create account</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && profile.user.role.slug === "customer" ? (
            <Card>
              <CardHeader>
                <CardTitle>Choose details</CardTitle>
                <CardDescription>
                  Available times update as you change service, barber, or
                  date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {catalog.kind === "loading" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Loading…
                  </p>
                ) : null}
                {catalog.kind === "error" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {catalog.message}
                  </p>
                ) : null}

                {catalog.kind === "ok" ? (
                  <form className="flex flex-col gap-4" onSubmit={onBook}>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="b-service">Service</Label>
                      <select
                        id="b-service"
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={serviceId ?? ""}
                        onChange={(ev) =>
                          setServiceId(
                            ev.target.value === ""
                              ? null
                              : Number.parseInt(ev.target.value, 10),
                          )
                        }
                        required
                      >
                        <option value="">Select a service</option>
                        {catalog.services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.duration_minutes} min ·{" "}
                            {formatUsd(s.price_cents)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="b-barber">Barber</Label>
                      <select
                        id="b-barber"
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={barberId ?? ""}
                        onChange={(ev) =>
                          setBarberId(
                            ev.target.value === ""
                              ? null
                              : Number.parseInt(ev.target.value, 10),
                          )
                        }
                        required
                      >
                        <option value="">Select a barber</option>
                        {catalog.barbers.map((row) => (
                          <option key={row.id} value={row.barber.id}>
                            {row.barber.name}
                            {row.title ? ` — ${row.title}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="b-date">Date</Label>
                      <input
                        id="b-date"
                        type="date"
                        min={todayIso()}
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={date}
                        onChange={(ev) => setDate(ev.target.value)}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Time</Label>
                      {slots.kind === "idle" ? (
                        <p className="text-sm text-muted-foreground">
                          Pick a service, barber, and date to see open times.
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
                        <p
                          className="text-sm text-destructive"
                          role="alert"
                        >
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
                          className="flex flex-wrap gap-2"
                        >
                          {slots.slots.map((slot) => {
                            const checked = selectedSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                role="radio"
                                aria-checked={checked}
                                onClick={() => setSelectedSlot(slot)}
                                className={
                                  checked
                                    ? "min-h-11 rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground sm:min-h-9"
                                    : "min-h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/60 sm:min-h-9"
                                }
                              >
                                {formatTimeFromIso(slot)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="b-notes">Notes (optional)</Label>
                      <textarea
                        id="b-notes"
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                        value={notes}
                        onChange={(ev) => setNotes(ev.target.value)}
                        placeholder="Anything we should know?"
                      />
                    </div>

                    {selectedService && selectedBarber && selectedSlot ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                        <p>
                          <span className="font-medium">{selectedService.name}</span>
                          {" with "}
                          <span className="font-medium">
                            {selectedBarber.barber.name}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          {date} · {formatTimeFromIso(selectedSlot)} ·{" "}
                          {selectedService.duration_minutes} min ·{" "}
                          {formatUsd(selectedService.price_cents)}
                        </p>
                        {selectedService.deposit_cents > 0 ? (
                          <p className="mt-1 text-muted-foreground">
                            Deposit due now:{" "}
                            <span className="font-medium text-foreground">
                              {formatUsd(selectedService.deposit_cents)}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {bookError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {bookError}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={
                        bookBusy ||
                        serviceId === null ||
                        barberId === null ||
                        selectedSlot === null
                      }
                    >
                      {bookBusy ? "Booking…" : "Confirm booking"}
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookingFlow />
    </Suspense>
  );
}
