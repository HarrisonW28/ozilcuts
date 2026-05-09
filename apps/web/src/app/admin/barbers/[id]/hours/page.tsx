"use client";

import { ManageBarberHoursSection } from "@/components/manage-barber-hours-section";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchManageBarbers } from "@ozilcuts/api";
import type { BarberManageRow } from "@ozilcuts/types";
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
import { useCallback, useEffect, useState } from "react";

async function findBarberRow(
  token: string,
  userId: number,
): Promise<BarberManageRow | null> {
  let page = 1;
  let lastPage = 1;
  do {
    const batch = await fetchManageBarbers(token, page);
    const row = batch.data.find((r) => r.user.id === userId);
    if (row) return row;
    lastPage = batch.meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return null;
}

export default function AdminBarberHoursPage() {
  const params = useParams();
  const { profile, signOut } = useSessionProfile();
  const rawId = params?.id;
  const userId =
    typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number.NaN;

  const [barberName, setBarberName] = useState<string | null>(null);
  const [lookup, setLookup] = useState<"idle" | "loading" | "ok" | "missing">(
    "idle",
  );
  const [lookupError, setLookupError] = useState<string | null>(null);

  const isAdmin = profile.kind === "ready" && profile.user.role.slug === "admin";

  const loadMeta = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token || !Number.isFinite(userId)) return;
    setLookup("loading");
    setLookupError(null);
    try {
      const row = await findBarberRow(token, userId);
      if (!row) {
        setLookup("missing");
        setBarberName(null);
        return;
      }
      setBarberName(row.user.name);
      setLookup("ok");
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not verify barber.";
      setLookupError(message);
      setLookup("idle");
    }
  }, [userId]);

  useEffect(() => {
    if (!isAdmin || !Number.isFinite(userId)) return;
    void loadMeta();
  }, [isAdmin, userId, loadMeta]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Bookable hours"
            description={
              barberName
                ? `Weekly availability for ${barberName}. Clients only see bookable slots inside these windows.`
                : "Set weekly availability for this barber. Clients only see bookable slots inside these windows."
            }
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              Session issue. Sign in again.
            </p>
          ) : null}

          {profile.kind === "ready" && !isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admin only</CardTitle>
                <CardDescription>
                  Sign in with a shop administrator account to edit barber
                  schedules.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {!Number.isFinite(userId) && isAdmin ? (
            <p className="text-sm text-destructive" role="alert">
              Invalid barber link.
            </p>
          ) : null}

          {lookupError ? (
            <p className="text-sm text-destructive" role="alert">
              {lookupError}
            </p>
          ) : null}

          {isAdmin && Number.isFinite(userId) && lookup === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {isAdmin && lookup === "missing" ? (
            <Card>
              <CardHeader>
                <CardTitle>Barber not found</CardTitle>
                <CardDescription>
                  This person isn&apos;t on your team list, or the link is out
                  of date.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/admin/barbers">Back to team</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isAdmin && lookup === "ok" && Number.isFinite(userId) ? (
            <ManageBarberHoursSection
              userId={userId}
              compactAddRemove={false}
            />
          ) : null}

          {isAdmin ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/admin/barbers"
                className="underline-offset-4 hover:underline"
              >
                Back to team
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
