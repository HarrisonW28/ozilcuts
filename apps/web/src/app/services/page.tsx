"use client";

import { SiteHeader } from "@/components/site-header";
import { CatalogCardGridSkeleton } from "@/components/load-empty";
import {
  ozilcutsPageEnterInitial,
  ozilcutsPageEnterTransition,
} from "@/lib/motion";
import { formatGbp } from "@/lib/format-gbp";
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
  EmptyState,
} from "@ozilcuts/ui";
import type { ServiceSummary } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ServicesState =
  | { kind: "loading" }
  | { kind: "ok"; items: ServiceSummary[] }
  | { kind: "error"; message: string };

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
            title="The menu"
            description="Time, price, and what to expect — then book in one flow."
            className="gap-5 pb-1 sm:gap-6"
          />

          {state.kind === "loading" ? (
            <CatalogCardGridSkeleton
              count={6}
              statusLabel="Loading services"
              className="gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-7"
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
                className="min-h-11 shrink-0 touch-manipulation sm:min-h-9"
                onClick={retry}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {state.kind === "ok" && state.items.length === 0 ? (
            <EmptyState
              title="No services listed"
              description="Pricing and services will appear here when your shop adds them."
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
              aria-label="Service list"
            >
              {state.items.map((svc) => (
                <li key={svc.id}>
                  <Card className="flex h-full flex-col overflow-hidden border-border/55 shadow-sm transition-[box-shadow,transform] motion-safe:hover:-translate-y-px dark:shadow-md">
                    <CardHeader className="border-b border-border/35 bg-muted/[0.06] pb-4 dark:bg-muted/[0.04]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Service
                      </p>
                      <CardTitle className="mt-2 text-xl font-semibold leading-snug tracking-tight">
                        {svc.name}
                      </CardTitle>
                      {svc.description ? (
                        <CardDescription className="mt-2 line-clamp-3 text-sm leading-relaxed">
                          {svc.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col pt-5 pb-2">
                      <dl className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border/30 pb-5">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Duration
                          </dt>
                          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                            {svc.duration_minutes}
                            <span className="text-base font-medium text-muted-foreground">
                              {" "}
                              min
                            </span>
                          </dd>
                        </div>
                        <div className="text-end">
                          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            From
                          </dt>
                          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                            {formatGbp(svc.price_cents)}
                          </dd>
                        </div>
                        {svc.deposit_cents > 0 ? (
                          <div className="w-full border-t border-border/30 pt-4">
                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {svc.deposit_policy === "first_time_customer"
                                ? "Deposit (first-time)"
                                : "Deposit at booking"}
                            </dt>
                            <dd className="mt-1 font-medium text-foreground">
                              {formatGbp(svc.deposit_cents)}
                              {svc.deposit_policy === "first_time_customer" ? (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  Returning guests skip this.
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </CardContent>
                    <CardFooter className="mt-auto border-t border-border/35 bg-muted/[0.04] py-4 dark:bg-muted/[0.03]">
                      <Button
                        asChild
                        size="sm"
                        className="h-11 w-full touch-manipulation sm:h-10"
                      >
                        <Link href={`/book?service_id=${svc.id}`}>
                          Reserve this service
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          ) : null}

          {state.kind !== "loading" ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="underline-offset-4 hover:underline">
                Back to home
              </Link>
            </p>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
