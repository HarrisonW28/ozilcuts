"use client";

import { CustomerVisitsView } from "@/components/customer-visits-view";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchCustomerAnalytics } from "@ozilcuts/api";
import type { CustomerAnalyticsResponse } from "@ozilcuts/types";
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

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerAnalyticsResponse }
  | { kind: "error"; message: string };

export default function AdminCustomerAnalyticsPage() {
  const params = useParams();
  const idParam = params.id;
  const customerUserId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";

  const [state, setState] = useState<LoadState>({ kind: "idle" });

  useEffect(() => {
    if (!isAdmin || !Number.isFinite(customerUserId) || customerUserId < 1) {
      return;
    }
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchCustomerAnalytics(token, customerUserId)
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
              : "Could not load this customer.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, customerUserId]);

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
              state.kind === "ok"
                ? `${state.data.summary.customer_name} · visits`
                : "Customer analytics"
            }
            description="Lifetime totals, cadence, and a visual visit timeline (newest first)."
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

          {isAdmin && state.kind === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading customer…
            </p>
          ) : null}

          {isAdmin && state.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}

          {isAdmin && state.kind === "ok" ? (
            <>
              <CustomerVisitsView data={state.data} linkAppointments />
              <p className="text-xs text-muted-foreground">
                {state.data.summary.customer_email}
              </p>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/admin/reports/customers"
              className="underline-offset-4 hover:underline"
            >
              Back to customer report
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
