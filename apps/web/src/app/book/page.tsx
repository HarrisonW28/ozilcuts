"use client";

import { StaffCustomerLookup } from "@/components/staff-customer-lookup";
import { SiteHeader } from "@/components/site-header";
import {
  BookCatalogFormSkeleton,
  TimeSlotChipsSkeleton,
} from "@/components/load-empty";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  createAppointment,
  fetchBarberSlots,
  fetchBarbers,
  fetchCustomerProfile,
  fetchNextVisitSuggestion,
  fetchServices,
} from "@ozilcuts/api";
import type {
  BarberProfilePublic,
  CustomerProfile,
  RebookSuggestion,
  ServiceSummary,
  StaffCustomerLookupRow,
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
  cn,
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

type QuickRepeatState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ok";
      nextVisit: RebookSuggestion | null;
      customerProfile: CustomerProfile | null;
    };

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

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
  const [selectedCustomer, setSelectedCustomer] =
    useState<StaffCustomerLookupRow | null>(null);
  const [quickRepeat, setQuickRepeat] = useState<QuickRepeatState>({
    kind: "idle",
  });

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

  useEffect(() => {
    if (profile.kind !== "ready" || profile.user.role.slug !== "customer") {
      setQuickRepeat({ kind: "idle" });
      return;
    }

    const token = getStoredAuthToken();
    if (!token) return;

    let cancelled = false;
    setQuickRepeat({ kind: "loading" });
    Promise.allSettled([
      fetchNextVisitSuggestion(token),
      fetchCustomerProfile(token),
    ]).then(([nextVisitResult, profileResult]) => {
      if (cancelled) return;

      setQuickRepeat({
        kind: "ok",
        nextVisit:
          nextVisitResult.status === "fulfilled" ? nextVisitResult.value : null,
        customerProfile:
          profileResult.status === "fulfilled" ? profileResult.value : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    if (profile.user.role.slug !== "barber") return;
    if (barberId !== null) return;
    if (catalog.kind !== "ok") return;
    const selfId = profile.user.id;
    if (catalog.barbers.some((b) => b.barber.id === selfId)) {
      setBarberId(selfId);
    }
  }, [profile, catalog, barberId]);

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

  const preferredBarber = useMemo(() => {
    if (catalog.kind !== "ok" || quickRepeat.kind !== "ok") return null;
    const preferredId = quickRepeat.customerProfile?.preferred_barber_user_id;
    if (preferredId === null || preferredId === undefined) return null;
    return catalog.barbers.find((b) => b.barber.id === preferredId) ?? null;
  }, [catalog, quickRepeat]);

  function applyNextVisitSuggestion(suggestion: RebookSuggestion) {
    setServiceId(suggestion.service_id);
    setBarberId(suggestion.barber_user_id);
    setDate(parseIsoDateParam(suggestion.suggested_date, today));
    setSelectedSlot(null);
    setBookError(null);
  }

  function applyPreferredBarberShortcut(barberUserId: number) {
    setBarberId(barberUserId);
    setSelectedSlot(null);
    setBookError(null);
  }

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    const bookingAsStaff =
      profile.kind === "ready" &&
      (profile.user.role.slug === "admin" ||
        profile.user.role.slug === "barber");
    if (
      serviceId === null ||
      barberId === null ||
      selectedSlot === null ||
      (bookingAsStaff && selectedCustomer === null)
    ) {
      setBookError(
        bookingAsStaff && selectedCustomer === null
          ? "Search and select a customer."
          : "Select a service, barber, and time.",
      );

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
        ...(bookingAsStaff && selectedCustomer !== null
          ? { customer_user_id: selectedCustomer.id }
          : {}),
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
  const isCustomer = isReady && profile.user.role.slug === "customer";
  const isStaffBooker =
    isReady &&
    (profile.user.role.slug === "admin" ||
      profile.user.role.slug === "barber");
  const canBookOnline = isCustomer || isStaffBooker;
  const catalogReady = catalog.kind === "ok";
  const bookingSelectionComplete =
    canBookOnline &&
    catalogReady &&
    serviceId !== null &&
    barberId !== null &&
    selectedSlot !== null &&
    (!isStaffBooker || selectedCustomer !== null);
  const needsMobileBookPadding = bookingSelectionComplete;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div
          className={cn(
            "mx-auto w-full max-w-3xl page-stack",
            needsMobileBookPadding &&
              "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
          )}
        >
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title={isStaffBooker ? "Book for a customer" : "Reserve your chair"}
            description={
              isStaffBooker
                ? "Look up the customer, then choose service, barber, and time—the appointment is tied to their account."
                : "Choose a service and barber, then pick a time that fits—quiet, fast, and mobile-first."
            }
            className="gap-5 sm:gap-6"
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

          {isReady &&
          profile.user.role.slug === "customer" &&
          quickRepeat.kind === "loading" ? (
            <Card
              className="border-primary/25 bg-primary/[0.03] shadow-sm dark:border-primary/20 dark:bg-primary/[0.05]"
              aria-busy="true"
              aria-label="Loading quick rebook suggestions"
            >
              <CardHeader className="pb-2">
                <div className="h-5 w-36 max-w-full animate-pulse rounded-md bg-muted/60" />
                <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-md bg-muted/45" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-24 rounded-xl border border-border/40 bg-muted/25 p-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/55" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/40" />
                  <div className="mt-2 h-3 w-4/5 max-w-sm animate-pulse rounded bg-muted/35" />
                  <div className="mt-4 h-10 w-36 animate-pulse rounded-md bg-muted/50" />
                </div>
                <p className="text-xs text-muted-foreground" role="status">
                  Looking for your usual cut…
                </p>
              </CardContent>
            </Card>
          ) : null}

          {isReady &&
          profile.user.role.slug === "customer" &&
          quickRepeat.kind === "ok" &&
          (quickRepeat.nextVisit || preferredBarber) ? (
            <Card className="border-primary/35 bg-primary/5 shadow-sm dark:border-primary/30">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg tracking-tight sm:text-xl">
                  Quick rebook
                </CardTitle>
                <CardDescription>
                  Jump back into your usual flow, then choose the exact time
                  that works for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {quickRepeat.nextVisit ? (
                  <div className="dashboard-surface motion-card rounded-xl p-4">
                    <p className="font-semibold text-foreground">
                      Repeat your last cut
                    </p>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground">
                      {quickRepeat.nextVisit.service?.name ?? "Your service"}
                      {quickRepeat.nextVisit.barber
                        ? ` with ${quickRepeat.nextVisit.barber.name}`
                        : ""}
                      {" · suggested "}
                      {formatIsoDate(quickRepeat.nextVisit.suggested_date)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 min-h-11 touch-manipulation sm:min-h-10"
                      onClick={() =>
                        applyNextVisitSuggestion(quickRepeat.nextVisit!)
                      }
                    >
                      Use this cut
                    </Button>
                  </div>
                ) : null}

                {preferredBarber ? (
                  <div className="dashboard-surface motion-card rounded-xl p-4">
                    <p className="font-semibold text-foreground">
                      Favourite barber
                    </p>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground">
                      Start with {preferredBarber.barber.name}
                      {preferredBarber.title
                        ? ` · ${preferredBarber.title}`
                        : ""}
                      .
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-4 min-h-11 touch-manipulation sm:min-h-10"
                      onClick={() =>
                        applyPreferredBarberShortcut(preferredBarber.barber.id)
                      }
                    >
                      Book with {preferredBarber.barber.name.split(" ")[0]}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
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

          {canBookOnline ? (
            <Card size="sm" className="dashboard-surface overflow-visible">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg tracking-tight">
                  {isStaffBooker ? "Appointment details" : "Your appointment"}
                </CardTitle>
                <CardDescription>
                  Times refresh when you change service, barber, or date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {catalog.kind === "loading" ? (
                  <BookCatalogFormSkeleton />
                ) : null}
                {catalog.kind === "error" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {catalog.message}
                  </p>
                ) : null}

                {catalog.kind === "ok" ? (
                  <form
                    id="booking-flow-form"
                    className="flex flex-col gap-6"
                    onSubmit={onBook}
                  >
                    {isStaffBooker ? (
                      <StaffCustomerLookup
                        value={selectedCustomer}
                        onChange={(row) => {
                          setSelectedCustomer(row);
                          setBookError(null);
                        }}
                      />
                    ) : null}

                    <div className="flex flex-col gap-3">
                      <p
                        id="book-step-service"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Service
                      </p>
                      {catalog.services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No bookable services yet.
                        </p>
                      ) : (
                        <div
                          role="radiogroup"
                          aria-labelledby="book-step-service"
                          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3"
                        >
                          {catalog.services.map((s) => {
                            const selected = serviceId === s.id;

                            return (
                              <button
                                key={s.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => {
                                  setServiceId(s.id);
                                  setSelectedSlot(null);
                                  setBookError(null);
                                }}
                                className={cn(
                                  "motion-interactive flex min-h-[4.25rem] touch-manipulation flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow]",
                                  selected
                                    ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/25"
                                    : "border-border/65 bg-background hover:bg-muted/45 active:bg-muted/55",
                                )}
                              >
                                <span className="font-semibold leading-snug text-foreground">
                                  {s.name}
                                </span>
                                <span className="mt-1 text-sm tabular-nums text-muted-foreground">
                                  {s.duration_minutes} min ·{" "}
                                  {formatUsd(s.price_cents)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <p
                        id="book-step-barber"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Barber
                      </p>
                      {catalog.barbers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No barbers available to book yet.
                        </p>
                      ) : (
                        <div
                          role="radiogroup"
                          aria-labelledby="book-step-barber"
                          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3"
                        >
                          {catalog.barbers.map((row) => {
                            const selected = barberId === row.barber.id;

                            return (
                              <button
                                key={row.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => {
                                  setBarberId(row.barber.id);
                                  setSelectedSlot(null);
                                  setBookError(null);
                                }}
                                className={cn(
                                  "motion-interactive flex min-h-14 touch-manipulation flex-col items-start rounded-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow]",
                                  selected
                                    ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/25"
                                    : "border-border/65 bg-background hover:bg-muted/45 active:bg-muted/55",
                                )}
                              >
                                <span className="font-semibold text-foreground">
                                  {row.barber.name}
                                </span>
                                {row.title ? (
                                  <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                                    {row.title}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor="b-date"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Date
                      </Label>
                      <input
                        id="b-date"
                        type="date"
                        min={todayIso()}
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-12 w-full max-w-full rounded-xl border px-3 text-base shadow-xs outline-none focus-visible:ring-[3px] sm:h-11 sm:text-sm"
                        value={date}
                        onChange={(ev) => {
                          setDate(ev.target.value);
                          setSelectedSlot(null);
                        }}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        {formatIsoDate(date)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <p
                        id="book-step-time"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Time
                      </p>
                      {slots.kind === "idle" ? (
                        <p className="text-sm text-muted-foreground">
                          Choose a service, barber, and date to see open times.
                        </p>
                      ) : null}
                      {slots.kind === "loading" ? (
                        <TimeSlotChipsSkeleton />
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
                          No openings on this day — try another date.
                        </p>
                      ) : null}
                      {slots.kind === "ok" && slots.slots.length > 0 ? (
                        <div
                          role="radiogroup"
                          aria-labelledby="book-step-time"
                          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
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
                                className={cn(
                                  "motion-interactive min-h-12 rounded-xl border px-2 text-sm font-medium tabular-nums touch-manipulation transition-[border-color,background-color,transform] sm:min-h-11",
                                  checked
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border/70 bg-background text-foreground hover:bg-muted/50 motion-safe:active:scale-[0.98]",
                                )}
                              >
                                {formatTimeFromIso(slot)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <details className="group rounded-xl border border-border/50 bg-muted/10 open:bg-muted/15">
                      <summary className="motion-interactive cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="flex items-center justify-between gap-2">
                          Notes{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            optional
                          </span>
                        </span>
                      </summary>
                      <div className="border-t border-border/40 px-4 pb-4 pt-2">
                        <Label htmlFor="b-notes" className="sr-only">
                          Booking notes
                        </Label>
                        <textarea
                          id="b-notes"
                          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                          value={notes}
                          onChange={(ev) => setNotes(ev.target.value)}
                          placeholder="Style preferences, allergies, running late…"
                          rows={4}
                        />
                      </div>
                    </details>

                    {selectedService && selectedBarber && selectedSlot ? (
                      <div className="dashboard-surface rounded-xl p-4 text-sm">
                        {selectedCustomer ? (
                          <p className="mb-2 font-medium leading-snug">
                            <span className="text-muted-foreground">For </span>
                            <span>{selectedCustomer.name}</span>
                          </p>
                        ) : null}
                        <p className="font-medium leading-snug">
                          <span>{selectedService.name}</span>
                          <span className="text-muted-foreground"> with </span>
                          <span>{selectedBarber.barber.name}</span>
                        </p>
                        <p className="mt-1.5 tabular-nums text-muted-foreground">
                          {formatIsoDate(date)} · {formatTimeFromIso(selectedSlot)}{" "}
                          · {selectedService.duration_minutes} min ·{" "}
                          {formatUsd(selectedService.price_cents)}
                        </p>
                        {selectedService.deposit_cents > 0 ? (
                          <p className="mt-2 text-muted-foreground">
                            Deposit due now{" "}
                            <span className="font-semibold text-foreground">
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
                      form="booking-flow-form"
                      disabled={
                        bookBusy ||
                        serviceId === null ||
                        barberId === null ||
                        selectedSlot === null ||
                        (isStaffBooker && selectedCustomer === null)
                      }
                      className="hidden w-full min-h-12 touch-manipulation sm:inline-flex sm:min-h-11 sm:w-auto"
                    >
                      {bookBusy ? "Booking…" : "Confirm booking"}
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {bookingSelectionComplete &&
          selectedService &&
          selectedBarber &&
          selectedSlot ? (
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
              <div
                className="pointer-events-auto border-t border-border/60 bg-background/95 px-4 pt-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.45)]"
                style={{
                  paddingBottom:
                    "max(0.85rem, env(safe-area-inset-bottom, 0px))",
                }}
              >
                <p className="mb-2 truncate text-center text-xs text-muted-foreground">
                  {selectedService.name} · {formatTimeFromIso(selectedSlot)} ·{" "}
                  {formatUsd(selectedService.price_cents)}
                </p>
                <Button
                  type="submit"
                  form="booking-flow-form"
                  disabled={bookBusy}
                  className="w-full min-h-12 touch-manipulation text-base font-semibold"
                >
                  {bookBusy ? "Booking…" : "Confirm booking"}
                </Button>
              </div>
            </div>
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
