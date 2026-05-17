"use client";

import { AccountSubnav } from "@/components/account-subnav";
import { CustomerIdentityHub } from "@/components/customer-identity-hub";
import { CustomerRelationshipSelfCard } from "@/components/customer-relationship";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchCustomerProfile,
  fetchHairProfile,
  fetchMyVisitsSummary,
} from "@ozilcuts/api";
import type {
  CustomerAnalyticsResponse,
  CustomerProfile,
  HairProfile,
} from "@ozilcuts/types";
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
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ok";
      visits: CustomerAnalyticsResponse;
      customerProfile: CustomerProfile;
      hairProfile: HairProfile | null;
    }
  | { kind: "error"; message: string };

export default function ProfileIdentityPage() {
  const { profile } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  const isCustomer =
    profile.kind === "ready" && profile.user.role.slug === "customer";

  const firstName = useMemo(() => {
    if (profile.kind !== "ready") return "";
    const n = profile.user.name.trim();
    return n.split(/\s+/)[0] ?? n;
  }, [profile]);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });

    const visitsP = fetchMyVisitsSummary(token);
    const profileP = fetchCustomerProfile(token);
    const hairP = fetchHairProfile(token);

    try {
      const [visits, customerProfile] = await Promise.all([visitsP, profileP]);
      let hairProfile: HairProfile | null = null;
      try {
        hairProfile = await hairP;
      } catch {
        hairProfile = null;
      }
      setState({
        kind: "ok",
        visits,
        customerProfile,
        hairProfile,
      });
    } catch (err: unknown) {
      setState({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Could not load your studio story.",
      });
    }
  }, []);

  useEffect(() => {
    if (!isCustomer) return;
    void load();
  }, [isCustomer, load]);

  return (
    <main id="main-content" className="page-main app-shell-scroll flex-1">
      <div className="mx-auto w-full max-w-5xl page-stack">
        <div className="flex flex-col gap-6">
          <ScreenTitle
            className="gap-3"
            title="Your studio story" 
            description="Timeline, loyalty, streaks, and the gallery that keeps you connected to your chair."
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
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCardSkeleton className="sm:col-span-2 lg:col-span-2" />
              <KpiCardSkeleton />
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        ) : null}

        {profile.kind === "none" ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                Sign in to see your loyalty, streaks, and haircut timeline.
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
                This view is for guests building a relationship with the studio.
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
            aria-label="Loading your studio story"
          >
            <span className="sr-only">Loading your studio story…</span>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCardSkeleton className="sm:col-span-2 lg:col-span-2" />
              <KpiCardSkeleton />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <Skeleton className="min-h-64 w-full rounded-xl" />
          </div>
        ) : null}

        {isCustomer && state.kind === "error" ? (
          <Card className="border-destructive/35 bg-destructive/5">
            <CardHeader>
              <CardTitle>Couldn&apos;t load this view</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Retry
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile/visits">Visit history only</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {isCustomer && state.kind === "ok" ? (
          <div className="space-y-6">
            <CustomerRelationshipSelfCard />
            <CustomerIdentityHub
              firstName={firstName}
              visits={state.visits}
              customerProfile={state.customerProfile}
              hairProfile={state.hairProfile}
            />
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/profile" className="underline-offset-4 hover:underline">
            Account settings
          </Link>
        </p>
      </div>
    </main>
  );
}
