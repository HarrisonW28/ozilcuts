"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchMyAppointments } from "@ozilcuts/api";
import type { AppointmentRecord, Paginated } from "@ozilcuts/types";
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
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; page: Paginated<AppointmentRecord> }
  | { kind: "error"; message: string };

function formatStart(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<ListState>({ kind: "idle" });
  const [page, setPage] = useState(1);

  const load = useCallback(async (p: number) => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchMyAppointments(token, p);
      setState({ kind: "ok", page: data });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load appointments.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    if (profile.kind !== "ready") return;
    void load(page);
  }, [profile, page, load]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="My appointments"
            description="Customers see their bookings; barbers see incoming bookings; admins see everything."
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
                  Create an account or sign in to view your appointments.
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

          {profile.kind === "ready" ? (
            <>
              {state.kind === "loading" || state.kind === "idle" ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Loading list…
                </p>
              ) : null}
              {state.kind === "error" ? (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
                  <p className="text-sm text-destructive">{state.message}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => void load(page)}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              {state.kind === "ok" && state.page.data.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Nothing booked yet</CardTitle>
                    <CardDescription>
                      Book your first appointment to see it listed here.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild>
                      <Link href="/services">Browse services</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}
              {state.kind === "ok" && state.page.data.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {state.page.data.map((row) => (
                    <li key={row.id}>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {row.service?.name ?? "Service"}
                          </CardTitle>
                          <CardDescription>
                            {formatStart(row.starts_at)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          {row.barber ? (
                            <p>
                              <span className="font-medium text-foreground">
                                Barber:{" "}
                              </span>
                              {row.barber.name}
                            </p>
                          ) : null}
                          {row.customer ? (
                            <p>
                              <span className="font-medium text-foreground">
                                Customer:{" "}
                              </span>
                              {row.customer.name}
                            </p>
                          ) : null}
                          <p>
                            <span className="font-medium text-foreground">
                              Status:{" "}
                            </span>
                            {row.status}
                          </p>
                          {row.notes ? (
                            <p className="whitespace-pre-wrap">
                              <span className="font-medium text-foreground">
                                Notes:{" "}
                              </span>
                              {row.notes}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : null}
              {state.kind === "ok" && state.page.meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {state.page.meta.current_page} of{" "}
                    {state.page.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={state.page.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        state.page.meta.current_page >=
                        state.page.meta.last_page
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
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
