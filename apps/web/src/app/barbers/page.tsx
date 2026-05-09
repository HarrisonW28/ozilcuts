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
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
        className="flex flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14"
      >
        <motion.div
          initial={motionInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={ozilcutsPageEnterTransition}
          className="mx-auto w-full max-w-3xl"
        >
          <ScreenTitle
            className="mb-8"
            eyebrow={OZILCUTS_APP_NAME}
            title="Our barbers"
            description="Meet the team—bios and booking availability will expand in later sprints."
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
              description="Profiles will show here once your shop publishes them. Check back soon."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Home</Link>
                </Button>
              }
            />
          ) : null}

          {state.kind === "ok" && state.items.length > 0 ? (
            <ul
              className="grid list-none gap-4 sm:grid-cols-2"
              aria-label="Barber directory"
            >
              {state.items.map((row) => (
                <li key={row.id}>
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg leading-snug">
                        <Link
                          href={`/barbers/${row.barber.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.barber.name}
                        </Link>
                      </CardTitle>
                      {row.title ? (
                        <CardDescription>{row.title}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="pb-2">
                      {row.bio ? (
                        <p className="line-clamp-4 text-sm text-muted-foreground">
                          {row.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Full bio on the profile page.
                        </p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/barbers/${row.barber.id}`}>
                          View profile
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
