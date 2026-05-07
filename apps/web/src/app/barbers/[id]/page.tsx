"use client";

import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchBarber } from "@ozilcuts/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ozilcuts/ui";
import type { BarberProfilePublic } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DetailState =
  | { kind: "loading" }
  | { kind: "ok"; profile: BarberProfilePublic }
  | { kind: "error"; message: string; notFound?: boolean };

export default function BarberDetailPage() {
  const params = useParams();
  const idParam = params.id;
  const userId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<DetailState>({ kind: "loading" });

  const load = useCallback(
    (isCancelled: () => boolean) => {
      if (!Number.isFinite(userId) || userId < 1) {
        setState({
          kind: "error",
          message: "Invalid barber link.",
        });

        return;
      }
      setState({ kind: "loading" });
      fetchBarber(userId)
        .then((row) => {
          if (isCancelled()) return;
          setState({ kind: "ok", profile: row });
        })
        .catch((err: unknown) => {
          if (isCancelled()) return;
          if (err instanceof ApiError && err.status === 404) {
            setState({
              kind: "error",
              message: "This barber profile could not be found.",
              notFound: true,
            });

            return;
          }
          const message =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Unable to load profile.";
          setState({ kind: "error", message });
        });
    },
    [userId],
  );

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

  const motionInitial = reduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 8 };

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
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto w-full max-w-2xl"
        >
          {state.kind === "loading" ? (
            <p
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              Loading profile…
            </p>
          ) : null}

          {state.kind === "error" ? (
            <div
              className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="text-sm text-destructive">{state.message}</p>
              <div className="flex flex-wrap gap-2">
                {state.notFound ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/barbers">All barbers</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={retry}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {state.kind === "ok" ? (
            <Card>
              <CardHeader>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Barber
                </p>
                <CardTitle className="text-2xl sm:text-3xl">
                  {state.profile.barber.name}
                </CardTitle>
                {state.profile.title ? (
                  <p className="text-base text-muted-foreground">
                    {state.profile.title}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {state.profile.years_experience !== null ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Experience: </span>
                    <span className="font-medium">
                      {state.profile.years_experience} years
                    </span>
                  </p>
                ) : null}
                {state.profile.bio ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {state.profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bio yet for this barber.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link href="/barbers" className="underline-offset-4 hover:underline">
              Back to all barbers
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
