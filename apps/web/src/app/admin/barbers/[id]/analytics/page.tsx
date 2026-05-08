"use client";

import { BarberAnalyticsView } from "@/components/barber-analytics-view";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchBarber } from "@ozilcuts/api";
import type { BarberProfilePublic } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type BarberState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; barber: BarberProfilePublic }
  | { kind: "error"; message: string };

export default function AdminBarberAnalyticsPage() {
  const params = useParams();
  const idParam = params.id;
  const barberUserId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";
  const [barberState, setBarberState] = useState<BarberState>({ kind: "idle" });

  useEffect(() => {
    if (!isAdmin || !Number.isFinite(barberUserId) || barberUserId < 1) {
      return;
    }
    const token = getStoredAuthToken();
    if (!token) return;
    let cancelled = false;
    setBarberState({ kind: "loading" });
    fetchBarber(barberUserId)
      .then((barber) => {
        if (cancelled) return;
        setBarberState({ kind: "ok", barber });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBarberState({
          kind: "error",
          message:
            err instanceof ApiError
              ? err.message
              : "Could not load barber.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, barberUserId]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title={
              barberState.kind === "ok"
                ? `${barberState.barber.barber.name} · analytics`
                : "Barber analytics"
            }
            description="Per-barber bookings, revenue, utilization, and customer mix."
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
                  This page is admin-only. Please sign in.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" && !isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admins only</CardTitle>
                <CardDescription>
                  This page is restricted to admin accounts.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isAdmin && barberState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {barberState.message}
            </p>
          ) : null}

          {isAdmin &&
          Number.isFinite(barberUserId) &&
          barberUserId > 0 ? (
            <BarberAnalyticsView barberUserId={barberUserId} />
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/admin/barbers"
              className="underline-offset-4 hover:underline"
            >
              Back to barbers
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
