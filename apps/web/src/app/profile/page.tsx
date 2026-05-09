"use client";

import { AccountSubnav } from "@/components/account-subnav";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchBarbers,
  fetchCustomerProfile,
  updateCustomerProfile,
} from "@ozilcuts/api";
import type { BarberProfilePublic, CustomerProfile } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScreenTitle,
  Skeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; profile: CustomerProfile; barbers: BarberProfilePublic[] }
  | { kind: "error"; message: string };

function fieldErrors(err: ApiValidationError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(err.fieldErrors())) {
    if (messages[0]) {
      out[field] = messages[0];
    }
  }

  return out;
}

export default function ProfilePage() {
  const { profile: session, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [phone, setPhone] = useState("");
  const [preferredBarberId, setPreferredBarberId] = useState("");
  const [preferences, setPreferences] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [retentionPaused, setRetentionPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFieldErrors, setSaveFieldErrors] = useState<
    Record<string, string>
  >({});

  const hydrateForm = useCallback((loaded: CustomerProfile) => {
    setPhone(loaded.phone ?? "");
    setPreferredBarberId(
      loaded.preferred_barber_user_id === null
        ? ""
        : String(loaded.preferred_barber_user_id),
    );
    setPreferences(loaded.preferences ?? "");
    setMarketingOptIn(loaded.marketing_opt_in);
    setRetentionPaused(loaded.retention_paused);
  }, []);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }

    setState({ kind: "loading" });
    setSaveMessage(null);
    setSaveError(null);
    setSaveFieldErrors({});
    try {
      const [customerProfile, barbers] = await Promise.all([
        fetchCustomerProfile(token),
        fetchBarbers(),
      ]);
      hydrateForm(customerProfile);
      setState({ kind: "ok", profile: customerProfile, barbers });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load your profile.";
      setState({ kind: "error", message });
    }
  }, [hydrateForm]);

  useEffect(() => {
    if (session.kind !== "ready") return;
    if (session.user.role.slug !== "customer") return;
    void load();
  }, [session, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;

    const preferred =
      preferredBarberId === "" ? null : Number.parseInt(preferredBarberId, 10);

    setBusy(true);
    setSaveMessage(null);
    setSaveError(null);
    setSaveFieldErrors({});
    try {
      const updated = await updateCustomerProfile(token, {
        phone: phone.trim() === "" ? null : phone.trim(),
        preferred_barber_user_id: Number.isFinite(preferred)
          ? preferred
          : null,
        preferences: preferences.trim() === "" ? null : preferences.trim(),
        marketing_opt_in: marketingOptIn,
        retention_paused: retentionPaused,
      });
      hydrateForm(updated);
      setState((prev) =>
        prev.kind === "ok" ? { ...prev, profile: updated } : prev,
      );
      setSaveMessage("Profile saved.");
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setSaveFieldErrors(fieldErrors(err));
        setSaveError(err.firstMessage() ?? "Validation failed.");
      } else if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError("Could not save your profile.");
      }
    } finally {
      setBusy(false);
    }
  }

  const isCustomer =
    session.kind === "ready" && session.user.role.slug === "customer";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={session} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-3xl page-stack">
          <div className="flex flex-col gap-6">
            <ScreenTitle
              className="gap-3"
              eyebrow={OZILCUTS_APP_NAME}
              title="Your profile"
              description="Keep your contact details and haircut preferences ready for future bookings."
            />
            {session.kind === "ready" ? (
              <AccountSubnav isCustomer={isCustomer} />
            ) : null}
          </div>

          {session.kind === "loading" ? (
            <div
              className="space-y-3"
              role="status"
              aria-busy="true"
              aria-label="Loading account"
            >
              <span className="sr-only">Loading…</span>
              <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : null}

          {session.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Create an account or sign in to edit your profile.
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

          {session.kind === "ready" && !isCustomer ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer accounts only</CardTitle>
                <CardDescription>
                  Staff profiles are managed from their staff tools.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isCustomer && (state.kind === "loading" || state.kind === "idle") ? (
            <Card
              role="status"
              aria-busy="true"
              aria-label="Loading profile"
            >
              <span className="sr-only">Loading profile…</span>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-11 w-[7.5rem] rounded-md" />
                  <Skeleton className="h-11 w-[7.5rem] rounded-md" />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isCustomer && state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn&rsquo;t load profile</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" variant="secondary" onClick={() => void load()}>
                  Retry
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isCustomer && state.kind === "ok" ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>
                  Account: {session.kind === "ready" ? session.user.email : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        value={session.kind === "ready" ? session.user.name : ""}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Name and email come from your account.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-phone">Phone</Label>
                      <Input
                        id="profile-phone"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(ev) => setPhone(ev.target.value)}
                        placeholder="+1 555 0100"
                        aria-invalid={saveFieldErrors.phone ? true : undefined}
                      />
                      {saveFieldErrors.phone ? (
                        <p className="text-sm text-destructive">
                          {saveFieldErrors.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="profile-barber">Preferred barber</Label>
                    <select
                      id="profile-barber"
                      className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                      value={preferredBarberId}
                      onChange={(ev) => setPreferredBarberId(ev.target.value)}
                      aria-invalid={
                        saveFieldErrors.preferred_barber_user_id
                          ? true
                          : undefined
                      }
                    >
                      <option value="">No preference</option>
                      {state.barbers.map((row) => (
                        <option key={row.barber.id} value={row.barber.id}>
                          {row.barber.name}
                          {row.title ? ` — ${row.title}` : ""}
                        </option>
                      ))}
                    </select>
                    {saveFieldErrors.preferred_barber_user_id ? (
                      <p className="text-sm text-destructive">
                        {saveFieldErrors.preferred_barber_user_id}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="profile-preferences">
                      Haircut preferences
                    </Label>
                    <textarea
                      id="profile-preferences"
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-32 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-28 sm:text-sm"
                      value={preferences}
                      onChange={(ev) => setPreferences(ev.target.value)}
                      placeholder="Fade notes, clipper guards, sensitivities, or anything your barber should know."
                      aria-invalid={
                        saveFieldErrors.preferences ? true : undefined
                      }
                    />
                    {saveFieldErrors.preferences ? (
                      <p className="text-sm text-destructive">
                        {saveFieldErrors.preferences}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                    <input
                      id="profile-marketing"
                      type="checkbox"
                      className="mt-1 size-4 rounded border-input"
                      checked={marketingOptIn}
                      onChange={(ev) => setMarketingOptIn(ev.target.checked)}
                    />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="profile-marketing">
                        Send me Ozilcuts updates
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Occasional service updates and appointment reminders.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                    <input
                      id="profile-retention-pause"
                      type="checkbox"
                      className="mt-1 size-4 rounded border-input"
                      checked={retentionPaused}
                      onChange={(ev) =>
                        setRetentionPaused(ev.target.checked)
                      }
                      aria-invalid={
                        saveFieldErrors.retention_paused ? true : undefined
                      }
                    />
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="profile-retention-pause">
                        Pause rebooking reminders
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When checked, we won&rsquo;t send &ldquo;time to
                        book again&rdquo; emails or inbox nudges.
                      </p>
                      {saveFieldErrors.retention_paused ? (
                        <p className="text-sm text-destructive">
                          {saveFieldErrors.retention_paused}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {saveMessage ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                      {saveMessage}
                    </p>
                  ) : null}
                  {saveError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {saveError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving…" : "Save profile"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => hydrateForm(state.profile)}
                    >
                      Reset changes
                    </Button>
                  </div>
                </form>
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
