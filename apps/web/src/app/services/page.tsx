"use client";

import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchServices } from "@ozilcuts/api";
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
import type { ServiceSummary } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ServicesState =
  | { kind: "loading" }
  | { kind: "ok"; items: ServiceSummary[] }
  | { kind: "error"; message: string };

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function ServicesPage() {
  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<ServicesState>({ kind: "loading" });

  const load = useCallback((isCancelled: () => boolean) => {
    setState({ kind: "loading" });
    fetchServices()
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
              : "Unable to load services.";
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
          className="mx-auto w-full max-w-3xl"
        >
          <ScreenTitle
            className="mb-8"
            eyebrow={OZILCUTS_APP_NAME}
            title="Services & pricing"
            description="Transparent durations and prices—pick what fits, then book your time."
          />

          {state.kind === "loading" ? (
            <p
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              Loading services…
            </p>
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
            <p className="text-sm text-muted-foreground" role="status">
              No services are available yet. Check back soon.
            </p>
          ) : null}

          {state.kind === "ok" && state.items.length > 0 ? (
            <ul
              className="grid list-none gap-4 sm:grid-cols-2"
              aria-label="Service list"
            >
              {state.items.map((svc) => (
                <li key={svc.id}>
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg leading-snug">
                        {svc.name}
                      </CardTitle>
                      {svc.description ? (
                        <CardDescription>{svc.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="pb-2">
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Duration</dt>
                          <dd className="font-medium">
                            {svc.duration_minutes} min
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Price</dt>
                          <dd className="font-medium">
                            {formatUsd(svc.price_cents)}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button asChild size="sm">
                        <Link href={`/book?service_id=${svc.id}`}>
                          Book this
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
