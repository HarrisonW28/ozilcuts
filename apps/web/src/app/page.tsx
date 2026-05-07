"use client";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import { fetchApiHealth } from "@ozilcuts/api";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  ScreenTitle,
} from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

function roleTagline(roleSlug: string): string {
  switch (roleSlug) {
    case "admin":
      return "Shop administration and team tools are on the roadmap—this home base will grow with your role.";
    case "barber":
      return "Chair-side scheduling and client management are coming next—your dashboard will start here.";
    default:
      return "Booking your next cut and managing visits will land here soon—thanks for being an early customer.";
  }
}

export default function Home() {
  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });

  const fetchHealthOnce = useCallback((isCancelled: () => boolean) => {
    setHealth({ kind: "loading" });
    fetchApiHealth()
      .then(() => {
        if (isCancelled()) return;
        setHealth({ kind: "ok" });
      })
      .catch((err: unknown) => {
        if (isCancelled()) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setHealth({ kind: "error", message });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchHealthOnce(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchHealthOnce]);

  const retryHealth = useCallback(() => {
    fetchHealthOnce(() => false);
  }, [fetchHealthOnce]);

  const motionInitial = reduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 8 };

  const heroTitle =
    profile.kind === "ready"
      ? `Welcome back, ${profile.user.name.split(" ")[0] ?? profile.user.name}`
      : "Barber booking, built for mobile-first shops.";

  const heroDescription =
    profile.kind === "ready" ? (
      <>
        <p className="mb-4">{roleTagline(profile.user.role.slug)}</p>
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {profile.user.email}
          </span>
        </p>
      </>
    ) : (
      <>
        Book trusted barbers, manage your shop, and keep clients coming
        back—all from one mobile-first experience. Customer and barber flows
        arrive in upcoming sprints.
      </>
    );

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-16"
      >
        <motion.div
          initial={motionInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-lg sm:max-w-xl"
        >
          <Card>
            <CardHeader>
              <ScreenTitle
                eyebrow={OZILCUTS_APP_NAME}
                title={heroTitle}
                description={heroDescription}
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {profile.kind === "none" ? (
                <>
                  <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                    <li>Mobile-first booking and reminders</li>
                    <li>Built for busy barbershops and solo chairs</li>
                    <li>Secure email, password, and Google sign-in</li>
                  </ul>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button asChild className="w-full sm:w-auto sm:flex-1">
                      <Link href="/register">Get started</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto sm:flex-1"
                    >
                      <Link href="/login">Sign in</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full sm:w-auto sm:flex-1"
                    >
                      <Link href="/services">Browse services</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full sm:w-auto sm:flex-1"
                    >
                      <Link href="/barbers">Browse barbers</Link>
                    </Button>
                  </div>
                  <GoogleSignInButton />
                </>
              ) : null}
              {profile.kind === "ready" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button asChild variant="outline" className="w-full sm:w-auto sm:flex-1">
                    <Link href="/services">View services & pricing</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto sm:flex-1">
                    <Link href="/barbers">Meet our barbers</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border/60 bg-muted/25 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p role="status" aria-live="polite" className="min-w-0 flex-1">
                API:{" "}
                {health.kind === "loading" || health.kind === "idle"
                  ? "Checking…"
                  : null}
                {health.kind === "ok" ? "Connected (/api/v1/health)." : null}
                {health.kind === "error"
                  ? `Unavailable (${health.message}). Start the Laravel API on port 8000 or set NEXT_PUBLIC_API_URL.`
                  : null}
              </p>
              {health.kind === "error" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 self-start sm:self-auto"
                  onClick={retryHealth}
                >
                  Retry
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
