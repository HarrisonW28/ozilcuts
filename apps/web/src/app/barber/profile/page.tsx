"use client";

import { PageSessionSkeleton, ProfileFormCardSkeleton } from "@/components/loading";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchMyBarberProfile,
  updateManagedBarberProfile,
} from "@ozilcuts/api";
import type { BarberProfilePublic } from "@ozilcuts/types";
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
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; publicProfile: BarberProfilePublic }
  | { kind: "error"; message: string };

export default function BarberProfileEditPage() {
  const { profile, signOut, refreshProfile } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const userId = profile.kind === "ready" ? profile.user.id : null;
  const isBarber =
    profile.kind === "ready" && profile.user.role.slug === "barber";

  const hydrate = useCallback((p: BarberProfilePublic) => {
    setTitle(p.title ?? "");
    setBio(p.bio ?? "");
    setYearsExperience(
      p.years_experience === null ? "" : String(p.years_experience),
    );
  }, []);

  const load = useCallback(async () => {
    if (userId === null) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    setSaveMessage(null);
    setSaveError(null);
    setFieldErrors({});
    try {
      const publicProfile = await fetchMyBarberProfile(token);
      hydrate(publicProfile);
      setState({ kind: "ok", publicProfile });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load profile.";
      setState({ kind: "error", message });
    }
  }, [userId, hydrate]);

  useEffect(() => {
    if (profile.kind !== "ready" || profile.user.role.slug !== "barber") {
      return;
    }
    void load();
  }, [profile, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token || userId === null) return;

    const yearsRaw = yearsExperience.trim();
    const yearsParsed =
      yearsRaw === "" ? null : Number.parseInt(yearsRaw, 10);
    if (yearsRaw !== "" && !Number.isFinite(yearsParsed)) {
      setFieldErrors({ years_experience: "Enter a valid number." });
      return;
    }

    setBusy(true);
    setSaveMessage(null);
    setSaveError(null);
    setFieldErrors({});
    try {
      await updateManagedBarberProfile(token, userId, {
        title: title.trim() || null,
        bio: bio.trim() || null,
        years_experience: yearsParsed,
      });
      setSaveMessage("Profile saved.");
      await load();
      void refreshProfile();
    } catch (err: unknown) {
      if (err instanceof ApiValidationError) {
        const fe = err.fieldErrors();
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(fe)) {
          if (v[0]) flat[k] = v[0];
        }
        setFieldErrors(flat);
        setSaveError(err.firstMessage() ?? "Could not save.");
      } else {
        setSaveError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (profile.kind === "loading" || profile.kind === "none") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main id="main-content" className="page-main">
          <PageSessionSkeleton
            className="max-w-2xl"
            statusLabel="Loading barber profile"
          />
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
          <p className="text-sm text-muted-foreground">Session issue.</p>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (!isBarber) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            This page is for barbers.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main id="main-content" className="page-main">
        <div className="mx-auto w-full max-w-2xl page-stack">
          <ScreenTitle
            title="Your profile"
            description="What clients see on your public page—title, bio, and experience. Name and email come from your account."
          />

          {state.kind === "loading" || state.kind === "idle" ? (
            <ProfileFormCardSkeleton />
          ) : null}

          {state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Could not load</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" variant="secondary" onClick={() => void load()}>
                  Retry
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {state.kind === "ok" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/barbers/${userId}`}>Public profile</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/barbers/${userId}/portfolio`}>Portfolio</Link>
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Directory details</CardTitle>
                  <CardDescription>
                    Published state is managed by your shop admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="barber-name">Name</Label>
                        <Input
                          id="barber-name"
                          value={profile.user.name}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">
                          Contact your admin to change your display name or email.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="barber-title">Title</Label>
                        <Input
                          id="barber-title"
                          value={title}
                          onChange={(ev) => setTitle(ev.target.value)}
                          placeholder="e.g. Senior stylist"
                          aria-invalid={fieldErrors.title ? true : undefined}
                        />
                        {fieldErrors.title ? (
                          <p className="text-sm text-destructive">
                            {fieldErrors.title}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="barber-years">Years experience</Label>
                        <Input
                          id="barber-years"
                          inputMode="numeric"
                          value={yearsExperience}
                          onChange={(ev) => setYearsExperience(ev.target.value)}
                          placeholder="e.g. 5"
                          aria-invalid={
                            fieldErrors.years_experience ? true : undefined
                          }
                        />
                        {fieldErrors.years_experience ? (
                          <p className="text-sm text-destructive">
                            {fieldErrors.years_experience}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="barber-bio">Bio</Label>
                      <textarea
                        id="barber-bio"
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-28 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:text-sm"
                        value={bio}
                        onChange={(ev) => setBio(ev.target.value)}
                        placeholder="Short intro for clients booking online."
                        aria-invalid={fieldErrors.bio ? true : undefined}
                      />
                      {fieldErrors.bio ? (
                        <p className="text-sm text-destructive">
                          {fieldErrors.bio}
                        </p>
                      ) : null}
                    </div>

                    {saveMessage ? (
                      <p
                        className="text-sm text-emerald-700 dark:text-emerald-300"
                        role="status"
                      >
                        {saveMessage}
                      </p>
                    ) : null}
                    {saveError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {saveError}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" pending={busy}>
                        {busy ? "Saving…" : "Save profile"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => hydrate(state.publicProfile)}
                      >
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/barber" className="underline-offset-4 hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
