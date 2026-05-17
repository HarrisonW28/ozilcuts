"use client";

import { BookingInstantConfirm } from "@/components/booking-instant-confirm";
import { BookingQuickShortcuts } from "@/components/booking-quick-shortcuts";
import { BookingSelectionChips } from "@/components/booking-selection-chips";
import { BarberTrustBookingStrip } from "@/components/barber-trust";
import { BookingSlotPicker } from "@/components/booking-slot-picker";
import { StaffCustomerLookup } from "@/components/staff-customer-lookup";
import { SiteHeader } from "@/components/site-header";
import { SignInPromptCard } from "@/components/auth/sign-in-prompt-card";
import { AUTH_COPY, bookPageDescription } from "@/lib/user-facing-copy";
import { useShellPageChrome } from "@/lib/use-shell-page-chrome";
import {
  BookCatalogFormSkeleton,
  BookQuickRepeatCardSkeleton,
} from "@/components/load-empty";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  readRememberedBooking,
  writeRememberedBooking,
} from "@/lib/booking-remembered-preferences";
import { orderSlotsWithSuggestions } from "@/lib/booking-slot-suggestions";
import { formatGbp } from "@/lib/format-gbp";
import { haptic } from "@/lib/haptics";
import type { SmartSlotHintsLoadStatus } from "@/lib/smart-slot-hints";
import { useSessionProfile } from "@/lib/use-session-profile";
import { abuseBlockedMessage } from "@/lib/abuse-errors";
import {
  ApiError,
  ApiValidationError,
  createAppointment,
  fetchBarberSlots,
  fetchBarberSmartSlotHints,
  fetchBarberTrust,
  fetchBarbers,
  fetchCustomerProfile,
  fetchNextVisitSuggestion,
  fetchServices,
} from "@ozilcuts/api";
import type {
  BarberProfilePublic,
  BarberSmartSlotHintsPayload,
  BarberTrustSummary,
  CustomerProfile,
  RebookSuggestion,
  ServiceSummary,
  StaffCustomerLookupRow,
} from "@ozilcuts/types";
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
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  const wantsExpress = search.get("express") === "1";

  const { profile, signOut } = useSessionProfile();

  const [catalog, setCatalog] = useState<CatalogState>({ kind: "loading" });
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId);
  const [barberId, setBarberId] = useState<number | null>(initialBarberId);
  const [date, setDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<SlotsState>({ kind: "idle" });
  const [slotHints, setSlotHints] = useState<BarberSmartSlotHintsPayload | null>(
    null,
  );
  const [slotHintsStatus, setSlotHintsStatus] =
    useState<SmartSlotHintsLoadStatus>("idle");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [bookBusy, setBookBusy] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<StaffCustomerLookupRow | null>(null);
  const [quickRepeat, setQuickRepeat] = useState<QuickRepeatState>({
    kind: "idle",
  });
  const [barberTrust, setBarberTrust] = useState<BarberTrustSummary | null>(
    null,
  );
  const [pickerExpanded, setPickerExpanded] = useState(
    () => !wantsExpress || !(initialServiceId && initialBarberId),
  );

  const rememberedAppliedRef = useRef(false);
  const pendingAutoSelectSlotRef = useRef(false);

  const hadUrlServiceBarberPrefill = useMemo(() => {
    return (
      parsePositiveIntParam(search.get("service_id")) !== null ||
      parsePositiveIntParam(search.get("service")) !== null ||
      parsePositiveIntParam(search.get("barber_user_id")) !== null ||
      parsePositiveIntParam(search.get("barber")) !== null
    );
  }, [search]);

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

  const isReady = profile.kind === "ready";
  const isCustomer = isReady && profile.user.role.slug === "customer";

  useEffect(() => {
    if (!wantsExpress) return;
    if (initialServiceId && initialBarberId) {
      pendingAutoSelectSlotRef.current = true;
      setPickerExpanded(false);
    }
  }, [wantsExpress, initialServiceId, initialBarberId]);

  useEffect(() => {
    if (rememberedAppliedRef.current) return;
    if (catalog.kind !== "ok") return;
    if (!isCustomer) return;
    if (hadUrlServiceBarberPrefill) return;
    const remembered = readRememberedBooking();
    if (!remembered) return;
    const svcOk = catalog.services.some((s) => s.id === remembered.serviceId);
    const barberOk = catalog.barbers.some(
      (b) => b.barber.id === remembered.barberId,
    );
    if (!svcOk || !barberOk) return;
    rememberedAppliedRef.current = true;
    pendingAutoSelectSlotRef.current = true;
    setServiceId(remembered.serviceId);
    setBarberId(remembered.barberId);
    if (remembered.dateYmd) {
      setDate(parseIsoDateParam(remembered.dateYmd, today));
    }
    setPickerExpanded(false);
    setSelectedSlot(null);
    setBookError(null);
  }, [catalog, isCustomer, hadUrlServiceBarberPrefill, today]);

  useEffect(() => {
    if (slots.kind === "error") {
      pendingAutoSelectSlotRef.current = false;
      return;
    }
    if (!pendingAutoSelectSlotRef.current) return;
    if (slots.kind !== "ok") return;
    if (slots.slots.length === 0) {
      pendingAutoSelectSlotRef.current = false;
      return;
    }
    pendingAutoSelectSlotRef.current = false;
    const ordered = orderSlotsWithSuggestions(
      slots.slots,
      date,
      new Date(),
      slotHints,
    );
    const first = ordered[0]?.slot;
    if (first) setSelectedSlot(first);
  }, [slots, date, slotHints]);

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

  useEffect(() => {
    if (barberId === null) {
      setBarberTrust(null);
      return;
    }
    let cancelled = false;
    fetchBarberTrust(barberId)
      .then((trust) => {
        if (!cancelled) setBarberTrust(trust);
      })
      .catch(() => {
        if (!cancelled) setBarberTrust(null);
      });
    return () => {
      cancelled = true;
    };
  }, [barberId]);

  const loadSlots = useCallback(async () => {
    if (serviceId === null || barberId === null || !date) {
      setSlots({ kind: "idle" });
      setSlotHints(null);
      setSlotHintsStatus("idle");
      return;
    }
    setSlots({ kind: "loading" });
    setSlotHints(null);
    setSlotHintsStatus("loading");
    setSelectedSlot(null);
    try {
      const token = getStoredAuthToken();
      const [dataOutcome, hintOutcome] = await Promise.all([
        fetchBarberSlots(barberId, serviceId, date).then(
          (d) => ({ ok: true as const, data: d }),
          (err: unknown) => ({ ok: false as const, err }),
        ),
        fetchBarberSmartSlotHints(barberId, serviceId, date, token).then(
          (h) => ({ ok: true as const, data: h }),
          () => ({ ok: false as const }),
        ),
      ]);

      if (!dataOutcome.ok) {
        throw dataOutcome.err;
      }

      setSlots({ kind: "ok", slots: dataOutcome.data.slots });
      if (hintOutcome.ok) {
        setSlotHints(hintOutcome.data);
        setSlotHintsStatus("ok");
      } else {
        setSlotHints(null);
        setSlotHintsStatus("error");
      }
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Unable to load times.";
      setSlots({ kind: "error", message });
      setSlotHints(null);
      setSlotHintsStatus("error");
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

  const rememberedChoice = useMemo(() => {
    if (!isCustomer || catalog.kind !== "ok") return null;
    const r = readRememberedBooking();
    if (!r) return null;
    const svcOk = catalog.services.some((s) => s.id === r.serviceId);
    const barberOk = catalog.barbers.some((b) => b.barber.id === r.barberId);
    return svcOk && barberOk ? r : null;
  }, [isCustomer, catalog]);

  const slotDisplayItems = useMemo(() => {
    if (slots.kind !== "ok") return [];
    return orderSlotsWithSuggestions(slots.slots, date, new Date(), slotHints);
  }, [slots, date, slotHints]);

  const customerProfileNotesHint = useMemo(() => {
    if (!isCustomer || quickRepeat.kind !== "ok") return "";
    return quickRepeat.customerProfile?.preferences?.trim() ?? "";
  }, [isCustomer, quickRepeat]);

  function applyNextVisitSuggestion(suggestion: RebookSuggestion) {
    pendingAutoSelectSlotRef.current = true;
    setServiceId(suggestion.service_id);
    setBarberId(suggestion.barber_user_id);
    setDate(parseIsoDateParam(suggestion.suggested_date, today));
    setPickerExpanded(false);
    setSelectedSlot(null);
    setBookError(null);
  }

  function applyPreferredBarberShortcut(barberUserId: number) {
    setBarberId(barberUserId);
    setPickerExpanded(true);
    setSelectedSlot(null);
    setBookError(null);
  }

  function applyRememberedServiceWithBarber(barberUserId: number) {
    if (!rememberedChoice || rememberedChoice.barberId !== barberUserId) {
      return;
    }
    pendingAutoSelectSlotRef.current = true;
    setServiceId(rememberedChoice.serviceId);
    setBarberId(rememberedChoice.barberId);
    if (rememberedChoice.dateYmd) {
      setDate(parseIsoDateParam(rememberedChoice.dateYmd, today));
    }
    setPickerExpanded(false);
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
      if (isCustomer) {
        writeRememberedBooking({ serviceId, barberId, dateYmd: date });
      }
      haptic("success");
      router.push(`/appointments/${booked.id}/confirmation?just_booked=1`);
      return;
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setBookError(err.firstMessage() ?? "Validation failed.");
      } else if (err instanceof ApiError) {
        setBookError(abuseBlockedMessage(err) ?? err.message);
      } else {
        setBookError("Could not book. Please try again.");
      }
    } finally {
      setBookBusy(false);
    }
  }

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
  const { inAppShell, useCompactShellHeader } = useShellPageChrome();
  const needsMobileBookPadding =
    bookingSelectionComplete && !useCompactShellHeader;

  const isCompactCustomerFlow =
    isCustomer &&
    !pickerExpanded &&
    serviceId !== null &&
    barberId !== null &&
    catalogReady;

  const showInstantConfirm =
    isCompactCustomerFlow &&
    bookingSelectionComplete &&
    selectedService &&
    selectedBarber &&
    selectedSlot;

  return (
    <>
      {!inAppShell ? (
        <SiteHeader profile={profile} onSignOut={signOut} />
      ) : null}
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div
          className={cn(
            "mx-auto w-full max-w-3xl page-stack",
            needsMobileBookPadding &&
              "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
          )}
        >
          <ScreenTitle
            title={isStaffBooker ? "Book for a customer" : "Reserve your chair"}
            description={bookPageDescription(isStaffBooker)}
            className="gap-5 sm:gap-6"
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <BookCatalogFormSkeleton />
          ) : null}

          {profile.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {AUTH_COPY.sessionIssueInline}
            </p>
          ) : null}

          {isReady &&
          profile.user.role.slug === "customer" &&
          quickRepeat.kind === "loading" ? (
            <BookQuickRepeatCardSkeleton />
          ) : null}

          {isReady &&
          profile.user.role.slug === "customer" &&
          quickRepeat.kind === "ok" ? (
            <BookingQuickShortcuts
              nextVisit={quickRepeat.nextVisit}
              preferredBarber={preferredBarber}
              rememberedChoice={rememberedChoice}
              onApplyNextVisit={applyNextVisitSuggestion}
              onApplyPreferredBarber={applyPreferredBarberShortcut}
              onApplyRememberedWithBarber={applyRememberedServiceWithBarber}
            />
          ) : null}


          {profile.kind === "none" ? (
            <SignInPromptCard
              description="You need an account to confirm a booking."
              returnTo="/book"
            />
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

                    {showInstantConfirm ? (
                      <BookingInstantConfirm
                        service={selectedService}
                        barber={selectedBarber}
                        date={date}
                        selectedSlot={selectedSlot}
                        bookBusy={bookBusy}
                        showDeposit
                        formId="booking-flow-form"
                        onEditDetails={() => setPickerExpanded(true)}
                      />
                    ) : null}

                    {isCompactCustomerFlow &&
                    selectedService &&
                    selectedBarber &&
                    !showInstantConfirm ? (
                      <BookingSelectionChips
                        service={selectedService}
                        barber={selectedBarber}
                        date={date}
                        onChangeService={() => setPickerExpanded(true)}
                        onChangeBarber={() => setPickerExpanded(true)}
                      />
                    ) : null}

                    {!isCompactCustomerFlow || pickerExpanded ? (
                    <>
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
                                  {formatGbp(s.price_cents)}
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
                    </>
                    ) : null}

                    {serviceId !== null && barberId !== null ? (
                      <>
                      {barberTrust ? (
                        <BarberTrustBookingStrip
                          trust={barberTrust}
                          barberUserId={barberId}
                        />
                      ) : null}
                      <BookingSlotPicker
                        date={date}
                        today={today}
                        slots={slots}
                        slotHints={slotHints}
                        slotHintsStatus={slotHintsStatus}
                        onRetrySlotHints={() => {
                          void loadSlots();
                        }}
                        viewerContext={isStaffBooker ? "staff" : "customer"}
                        selectedSlot={selectedSlot}
                        onSelectSlot={(slot) => {
                          setSelectedSlot(slot);
                          setBookError(null);
                        }}
                        onDateChange={(nextDate) => {
                          setDate(nextDate);
                          setSelectedSlot(null);
                        }}
                        onJumpToPredictedDay={(dateYmd) => {
                          pendingAutoSelectSlotRef.current = true;
                          setDate(parseIsoDateParam(dateYmd, today));
                          setSelectedSlot(null);
                          setBookError(null);
                        }}
                        onPickNextAvailable={() => {
                          const first = slotDisplayItems[0]?.slot;
                          if (first) setSelectedSlot(first);
                        }}
                      />
                      </>
                    ) : null}

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
                        {customerProfileNotesHint !== "" ? (
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-[70%]">
                              Reuse the haircut preferences saved on your
                              profile for this booking.
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="min-h-10 shrink-0 touch-manipulation"
                              onClick={() => {
                                const slice =
                                  customerProfileNotesHint.slice(0, 500);
                                setNotes((prev) => {
                                  const t = prev.trim();
                                  if (t === "") return slice;
                                  return `${t}\n${slice}`;
                                });
                              }}
                            >
                              Paste profile notes
                            </Button>
                          </div>
                        ) : null}
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

                    {selectedService &&
                    selectedBarber &&
                    selectedSlot &&
                    !showInstantConfirm ? (
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
                          {formatGbp(selectedService.price_cents)}
                        </p>
                        {selectedService.deposit_cents > 0 && !isStaffBooker ? (
                          <p className="mt-2 text-muted-foreground">
                            Deposit due now{" "}
                            <span className="font-semibold text-foreground">
                              {formatGbp(selectedService.deposit_cents)}
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
                      pending={bookBusy}
                      disabled={
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
          !showInstantConfirm &&
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
                  {formatGbp(selectedService.price_cents)}
                </p>
                <Button
                  type="submit"
                  form="booking-flow-form"
                  pending={bookBusy}
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
    </>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookingFlow />
    </Suspense>
  );
}
