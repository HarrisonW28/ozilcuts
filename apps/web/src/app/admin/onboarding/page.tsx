"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  applyServiceStarterPack,
  fetchManageBarberAvailability,
  fetchManageBarbers,
  fetchManageServices,
  patchShopOnboarding,
} from "@ozilcuts/api";
import type { BarberManageRow } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  buttonVariants,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STEP_LABELS = [
  "Shop details",
  "Add barbers",
  "Business hours",
  "Add services",
  "Payments",
  "Go live",
] as const;

async function loadAllManageBarbers(
  token: string,
): Promise<BarberManageRow[]> {
  const rows: BarberManageRow[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const batch = await fetchManageBarbers(token, page);
    rows.push(...batch.data);
    lastPage = batch.meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return rows;
}

const TOTAL_STEPS = STEP_LABELS.length;

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { profile, signOut, replaceProfile } = useSessionProfile();
  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState("");
  const [cashOnly, setCashOnly] = useState(true);
  const [depositsEnabled, setDepositsEnabled] = useState(true);
  const [tapToPayLater, setTapToPayLater] = useState(true);
  const [barberTotal, setBarberTotal] = useState<number | null>(null);
  const [serviceTotal, setServiceTotal] = useState<number | null>(null);
  const [hoursReady, setHoursReady] = useState<boolean | null>(null);
  const [hoursGaps, setHoursGaps] = useState<
    { userId: number; name: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [starterBusy, setStarterBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const refreshOnboardingSnapshot = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      const [servicesRes, barberRows] = await Promise.all([
        fetchManageServices(token, 1),
        loadAllManageBarbers(token),
      ]);
      setServiceTotal(servicesRes.meta.total);
      setBarberTotal(barberRows.length);

      if (barberRows.length === 0) {
        setHoursReady(false);
        setHoursGaps([]);
        return;
      }

      const avail = await Promise.all(
        barberRows.map((r) =>
          fetchManageBarberAvailability(token, r.user.id),
        ),
      );
      const gaps: { userId: number; name: string }[] = [];
      for (let i = 0; i < barberRows.length; i++) {
        const windowsCount = avail[i].weekdays.reduce(
          (n, d) => n + d.windows.length,
          0,
        );
        if (windowsCount === 0) {
          gaps.push({
            userId: barberRows[i].user.id,
            name: barberRows[i].user.name,
          });
        }
      }
      setHoursGaps(gaps);
      setHoursReady(gaps.length === 0);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStepError(e.message);
      }
    }
  }, []);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    if (profile.user.role.slug !== "admin") return;
    const sa = profile.user.shop_admin;
    if (!sa) return;
    const s = Math.min(Math.max(sa.onboarding_step, 1), TOTAL_STEPS);
    setStep(s);
    setShopName(
      sa.shop_display_name?.trim() !== ""
        ? (sa.shop_display_name ?? "")
        : profile.user.name,
    );
    setCashOnly(sa.shop_pays_cash_only);
    setDepositsEnabled(sa.shop_deposits_enabled);
    setTapToPayLater(sa.shop_tap_to_pay_later);
  }, [profile]);

  useEffect(() => {
    if (profile.kind !== "ready" || profile.user.role.slug !== "admin") {
      return;
    }
    if (step >= 2) {
      void refreshOnboardingSnapshot();
    }
  }, [profile, step, refreshOnboardingSnapshot]);

  async function persist(
    body: Parameters<typeof patchShopOnboarding>[1],
    nextStep: number,
  ) {
    const token = getStoredAuthToken();
    if (!token) return;
    setBusy(true);
    setStepError(null);
    try {
      const user = await patchShopOnboarding(token, {
        ...body,
        onboarding_step: nextStep,
      });
      replaceProfile(user);
      setStep(nextStep);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStepError(e.message);
      } else {
        setStepError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function goBack() {
    if (step <= 1 || busy) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setBusy(true);
    setStepError(null);
    try {
      const prev = step - 1;
      const user = await patchShopOnboarding(token, { onboarding_step: prev });
      replaceProfile(user);
      setStep(prev);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStepError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onApplyStarterPack() {
    const token = getStoredAuthToken();
    if (!token) return;
    setStarterBusy(true);
    setStepError(null);
    try {
      await applyServiceStarterPack(token);
      await refreshOnboardingSnapshot();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStepError(e.message);
      } else {
        setStepError("Could not add starter services.");
      }
    } finally {
      setStarterBusy(false);
    }
  }

  async function onFinish() {
    const sa = profile.kind === "ready" ? profile.user.shop_admin : undefined;
    if (sa?.onboarding_completed_at) {
      router.push("/admin");
      return;
    }

    const token = getStoredAuthToken();
    if (!token) return;
    setBusy(true);
    setStepError(null);
    try {
      const user = await patchShopOnboarding(token, { complete: true });
      replaceProfile(user);
      router.push("/admin");
      router.refresh();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setStepError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (profile.kind === "loading" || profile.kind === "none") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="page-main-hero"
        >
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (profile.kind === "error") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your account.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  if (profile.user.role.slug !== "admin" || !profile.user.shop_admin) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            Shop setup is only available to shop admin accounts.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Home
          </Link>
        </main>
      </div>
    );
  }

  const shopAdmin = profile.user.shop_admin;
  const setupAlreadyComplete = Boolean(shopAdmin.onboarding_completed_at);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-lg page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Set up your shop"
            description="A short, guided checklist—one step at a time. You can change everything later."
          />

          {setupAlreadyComplete ? (
            <div
              className="rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-3 text-sm text-muted-foreground dark:border-primary/30 dark:bg-primary/[0.08]"
              role="status"
            >
              <span className="font-medium text-foreground">
                Guided setup is complete.
              </span>{" "}
              Review any step below; choosing Continue still saves your shop
              settings.
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            You can open Team, catalog, or barber hours anytime; use{" "}
            <span className="font-medium text-foreground">
              Resume guided setup
            </span>{" "}
            in the header to return here.
          </p>

          <nav
            aria-label="Onboarding progress"
            className="flex flex-col gap-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="text-muted-foreground">
                Step {step} of {TOTAL_STEPS}
                {": "}
              </span>
              <span className="text-primary">{STEP_LABELS[step - 1]}</span>
            </p>
            <ol className="flex gap-1.5" aria-hidden>
              {STEP_LABELS.map((_, i) => {
                const idx = i + 1;
                const done = idx < step;
                const current = idx === step;
                return (
                  <li key={idx} className="h-1 min-w-0 flex-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-colors",
                        done && "bg-primary",
                        current && "bg-primary/65",
                        !done && !current && "bg-muted",
                      )}
                    />
                  </li>
                );
              })}
            </ol>
          </nav>

          {stepError ? (
            <p
              className="text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {stepError}
            </p>
          ) : null}

          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-lg">{STEP_LABELS[step - 1]}</CardTitle>
              <CardDescription className="text-pretty">
                {step === 1
                  ? "This is how clients will refer to your business in Ozilcuts."
                  : null}
                {step === 2
                  ? "Create barber accounts so clients can pick a chair and book online."
                  : null}
                {step === 3
                  ? "Each barber needs at least one weekly window before you can take bookings."
                  : null}
                {step === 4
                  ? "Start from our suggested menu or add your own in the catalog later."
                  : null}
                {step === 5
                  ? "We&apos;ll use these defaults for how you want to get paid."
                  : null}
                {step === 6
                  ? "You&apos;re ready to welcome clients. Head to the catalog when you need to tweak offerings."
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {step === 1 ? (
                <div className="space-y-2">
                  <label
                    htmlFor="shop-display-name"
                    className="text-sm font-medium leading-none"
                  >
                    Shop name
                  </label>
                  <input
                    id="shop-display-name"
                    name="shop_display_name"
                    autoComplete="organization"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Northside Barbers"
                    aria-describedby="shop-name-hint"
                  />
                  <p
                    id="shop-name-hint"
                    className="text-xs text-muted-foreground"
                  >
                    Use the name on your storefront or Instagram—clients
                    recognize it.
                  </p>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create barber logins from your team page. When at least one
                    barber exists, you can continue to set their bookable hours.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/admin/barbers"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Open team
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => void refreshOnboardingSnapshot()}
                    >
                      Refresh status
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {barberTotal === null
                      ? "Checking your roster…"
                      : barberTotal === 0
                        ? "No barbers yet—add one on the team page."
                        : `${barberTotal} barber${barberTotal === 1 ? "" : "s"} on file.`}
                  </p>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  {barberTotal === 0 ? (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Add at least one barber first (previous step or{" "}
                      <Link
                        href="/admin/barbers"
                        className="font-medium underline underline-offset-4"
                      >
                        Team
                      </Link>
                      ).
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Open a barber&apos;s <span className="font-medium text-foreground">Hours</span> from{" "}
                    <span className="font-medium text-foreground">Team</span>, or use the shortcuts below.{" "}
                    Everyone on the roster needs at least one open interval.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/admin/barbers"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Open team
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => void refreshOnboardingSnapshot()}
                    >
                      Refresh status
                    </Button>
                  </div>
                  {hoursGaps.length > 0 ? (
                    <ul className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3 text-sm">
                      <li className="font-medium text-foreground">
                        Still need hours ({hoursGaps.length}):
                      </li>
                      {hoursGaps.map((g) => (
                        <li key={g.userId}>
                          <Link
                            href={`/admin/barbers/${g.userId}/hours`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Set hours for {g.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {barberTotal === null || hoursReady === null
                      ? "Checking schedules…"
                      : hoursReady
                        ? "Every barber has at least one bookable window."
                        : "Add windows for each barber before continuing."}
                  </p>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Add Haircut, Skin Fade, Hair + Beard, and Beard Trim with
                    sensible defaults. Existing slugs are skipped—you won&apos;t
                    get duplicates.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={starterBusy}
                    onClick={() => void onApplyStarterPack()}
                  >
                    {starterBusy ? "Adding…" : "Add suggested services"}
                  </Button>
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {serviceTotal === null
                      ? "Checking your catalog…"
                      : serviceTotal === 0
                        ? "No services yet—use the button above or add manually in Catalog."
                        : `${serviceTotal} service${serviceTotal === 1 ? "" : "s"} available.`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Link
                      href="/admin/services"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open full catalog
                    </Link>{" "}
                    to add or edit services by hand.
                  </p>
                </div>
              ) : null}

              {step === 5 ? (
                <ul className="space-y-4">
                  <li className="flex gap-3 rounded-lg border border-border/80 bg-muted/25 p-3">
                    <input
                      id="pay-cash"
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-input"
                      checked={cashOnly}
                      onChange={(e) => setCashOnly(e.target.checked)}
                    />
                    <div>
                      <label htmlFor="pay-cash" className="font-medium text-sm">
                        Cash only at checkout
                      </label>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        Simple default for shops that settle up in the chair.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-lg border border-border/80 bg-muted/25 p-3">
                    <input
                      id="pay-deposit"
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-input"
                      checked={depositsEnabled}
                      onChange={(e) => setDepositsEnabled(e.target.checked)}
                    />
                    <div>
                      <label
                        htmlFor="pay-deposit"
                        className="font-medium text-sm"
                      >
                        Deposits enabled
                      </label>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        Hold appointments with a card or deposit policy on
                        services.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-lg border border-border/80 bg-muted/25 p-3">
                    <input
                      id="pay-tap"
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-input"
                      checked={tapToPayLater}
                      onChange={(e) => setTapToPayLater(e.target.checked)}
                    />
                    <div>
                      <label htmlFor="pay-tap" className="font-medium text-sm">
                        Tap to Pay later
                      </label>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        Plan for in-person tap when you&apos;re ready—we&apos;ll
                        keep the path open.
                      </p>
                    </div>
                  </li>
                </ul>
              ) : null}

              {step === 6 ? (
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p className="text-pretty">
                    Nice work. Your shop name, team, bookable hours, services,
                    and payment defaults are in place. Open the catalog or
                    reports any time from the header.
                  </p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-6 py-4 sm:flex-row sm:justify-between">
              <div className="flex w-full flex-wrap gap-2 sm:flex-1">
                {step > 1 && (step < 6 || setupAlreadyComplete) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => void goBack()}
                  >
                    Back
                  </Button>
                ) : null}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                {step < 6 ? (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={
                      busy ||
                      (step === 1 && shopName.trim().length < 2) ||
                      (step === 2 &&
                        (barberTotal === null || barberTotal < 1)) ||
                      (step === 3 && hoursReady !== true) ||
                      (step === 4 &&
                        (serviceTotal === null || serviceTotal < 1))
                    }
                    onClick={() => {
                      if (step === 1) {
                        void persist(
                          { shop_display_name: shopName.trim() },
                          2,
                        );
                      } else if (step === 2) {
                        if (barberTotal === null || barberTotal < 1) {
                          setStepError("Add at least one barber to continue.");
                          return;
                        }
                        void persist({}, 3);
                      } else if (step === 3) {
                        if (hoursReady !== true) {
                          setStepError(
                            "Set at least one bookable window for every barber.",
                          );
                          return;
                        }
                        void persist({}, 4);
                      } else if (step === 4) {
                        if (serviceTotal === null || serviceTotal < 1) {
                          setStepError(
                            "Add at least one service to continue.",
                          );
                          return;
                        }
                        void persist({}, 5);
                      } else if (step === 5) {
                        void persist(
                          {
                            shop_pays_cash_only: cashOnly,
                            shop_deposits_enabled: depositsEnabled,
                            shop_tap_to_pay_later: tapToPayLater,
                          },
                          6,
                        );
                      }
                    }}
                  >
                    {busy ? "Saving…" : "Continue"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => void onFinish()}
                  >
                    {busy
                      ? "Finishing…"
                      : setupAlreadyComplete
                        ? "Back to dashboard"
                        : "Finish & go to catalog"}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
