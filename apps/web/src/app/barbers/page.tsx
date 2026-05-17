"use client";

import { SiteHeader } from "@/components/site-header";
import { CatalogCardGridSkeleton } from "@/components/load-empty";
import {
  ozilcutsPageEnterInitial,
  ozilcutsPageEnterTransition,
} from "@/lib/motion";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchBarbers } from "@ozilcuts/api";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  EmptyState,
} from "@ozilcuts/ui";
import type { BarberProfilePublic } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function barberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

type BarbersState =
  | { kind: "loading" }
  | { kind: "ok"; items: BarberProfilePublic[] }
  | { kind: "error"; message: string };

export default function BarbersPage() {
  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<BarbersState>({ kind: "loading" });

  const load = useCallback((isCancelled: () => boolean) => {
    setState({ kind: "loading" });
    fetchBarbers()
      .then((items) => {
        if (isCancelled()) return;
        setState({ kind: "ok", items });
      })
      .catch((err: unknown) => {
        if (isCancelled()) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to load barbers.";
        setState({ kind: "error", message });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    load(() => false);
  }, [load]);

  const motionInitial = ozilcutsPageEnterInitial(reduceMotion);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <motion.div
          initial={motionInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={ozilcutsPageEnterTransition}
          className="mx-auto w-full max-w-5xl page-stack"
        >
          <ScreenTitle
            title="The team"
            description="Meet the team — portfolios, styles, and booking in a few taps."
            className="gap-5 pb-2 sm:gap-6"
          />

          {state.kind === "loading" ? (
            <CatalogCardGridSkeleton
              count={4}
              statusLabel="Loading barber profiles"
            />
          ) : null}

          {state.kind === "error" ? (
            <div
              className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="text-sm text-destructive">{state.message}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={retry}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {state.kind === "ok" && state.items.length === 0 ? (
            <EmptyState
              title="No barbers yet"
              description="The team will appear here soon — check back or ask at the studio."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Home</Link>
                </Button>
              }
            />
          ) : null}

          {state.kind === "ok" && state.items.length > 0 ? (
            <ul
              className="grid list-none gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-7 lg:gap-8"
              aria-label="Barber directory"
            >
              {state.items.map((row) => (
                <li key={row.id} className="min-w-0">
                  <Card className="h-full min-w-0 overflow-hidden border-border/55 shadow-sm dark:shadow-md">
                    <div className="border-b border-border/40 bg-gradient-to-b from-muted/45 to-muted/15 px-5 py-7 dark:from-muted/25 dark:to-muted/8">
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground/90">
                        {barberInitials(row.barber.name)}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Barber
                      </p>
                    </div>
                    <CardHeader className="pb-2 pt-5">
                      <CardTitle className="text-xl font-semibold leading-snug tracking-tight">
                        <Link
                          href={`/barbers/${row.barber.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.barber.name}
                        </Link>
                      </CardTitle>
                      {row.title ? (
                        <CardDescription className="text-sm">
                          {row.title}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="pb-2">
                      {row.bio ? (
                        <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                          {row.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Full story on the profile page.
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/35 bg-muted/[0.04] p-4 py-4 dark:bg-muted/[0.03]">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-0 px-2 text-xs sm:text-sm"
                      >
                        <Link href={`/barbers/${row.barber.id}`}>Profile</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="h-9 min-w-0 px-2 text-xs sm:text-sm"
                      >
                        <Link href={`/barbers/${row.barber.id}/portfolio`}>
                          Portfolio
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
