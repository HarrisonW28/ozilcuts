"use client";

import { AccountSubnav } from "@/components/account-subnav";
import { CustomerVisitsView } from "@/components/customer-visits-view";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchMyVisitsSummary } from "@ozilcuts/api";
import type { CustomerAnalyticsResponse } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  KpiCardSkeleton,
  ScreenTitle,
  Skeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerAnalyticsResponse }
  | { kind: "error"; message: string };

export default function MyVisitsPage() {
  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  const isCustomer =
    profile.kind === "ready" && profile.user.role.slug === "customer";

  useEffect(() => {
    if (!isCustomer) return;
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchMyVisitsSummary(token)
      .then((data) => {
        if (cancelled) return;
        setState({ kind: "ok", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            err instanceof ApiError
              ? err.message
              : "Failed to load visit summary.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isCustomer]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-5xl page-stack">
          <div className="flex flex-col gap-6">
            <ScreenTitle
              className="gap-3"
              eyebrow={OZILCUTS_APP_NAME}
              title="My visits"
              description="Summary tiles and a month-grouped timeline of your appointments."
            />
            {profile.kind === "ready" ? (
              <AccountSubnav isCustomer={isCustomer} />
            ) : null}
          </div>

          {profile.kind === "loading" ? (
            <div
              className="space-y-6"
              role="status"
              aria-busy="true"
              aria-label="Loading account"
            >
              <span className="sr-only">Loading…</span>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton className="sm:col-span-2 lg:col-span-1" />
              </div>
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Sign in to see your visit history.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" && !isCustomer ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer accounts only</CardTitle>
                <CardDescription>
                  This page shows your own visit history. Staff have separate
                  analytics in the admin and barber sections.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isCustomer && state.kind === "loading" ? (
            <div
              className="space-y-6"
              role="status"
              aria-busy="true"
              aria-label="Loading visits"
            >
              <span className="sr-only">Loading visits…</span>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton className="sm:col-span-2 lg:col-span-1" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          ) : null}

          {isCustomer && state.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}

          {isCustomer && state.kind === "ok" ? (
            <CustomerVisitsView data={state.data} linkAppointments />
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/profile"
              className="underline-offset-4 hover:underline"
            >
              Back to profile
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
