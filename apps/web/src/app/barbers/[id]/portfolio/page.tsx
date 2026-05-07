"use client";

import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchBarber,
  fetchBarberPortfolio,
} from "@ozilcuts/api";
import type {
  BarberProfilePublic,
  BarberPortfolioResponse,
} from "@ozilcuts/types";
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

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ok";
      barber: BarberProfilePublic;
      portfolio: BarberPortfolioResponse;
    }
  | { kind: "error"; message: string; notFound?: boolean };

const PER_PAGE = 24;

export default function BarberPortfolioPage() {
  const params = useParams();
  const idParam = params.id;
  const userId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId) || userId < 1) {
      setState({ kind: "error", message: "Invalid portfolio link." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const [barber, portfolio] = await Promise.all([
        fetchBarber(userId),
        fetchBarberPortfolio(userId, page, PER_PAGE),
      ]);
      setState({ kind: "ok", barber, portfolio });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setState({
          kind: "error",
          message: "This barber portfolio could not be found.",
          notFound: true,
        });

        return;
      }
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load portfolio.";
      setState({ kind: "error", message });
    }
  }, [userId, page]);

  useEffect(() => {
    void load();
  }, [load]);

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
                ? `${state.barber.barber.name} — Portfolio`
                : "Portfolio"
            }
            description={
              state.kind === "ok" && state.barber.title
                ? state.barber.title
                : "Recent cuts shared with permission."
            }
          />

          {state.kind === "loading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading portfolio…
            </p>
          ) : null}

          {state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {state.notFound ? "Not found" : "Couldn\u2019t load portfolio"}
                </CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                {state.notFound ? (
                  <Button asChild variant="outline">
                    <Link href="/barbers">All barbers</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void load()}
                  >
                    Retry
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : null}

          {state.kind === "ok" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {state.portfolio.meta.total === 0
                    ? "No photos yet — check back soon."
                    : `${state.portfolio.meta.total} photo${state.portfolio.meta.total === 1 ? "" : "s"}`}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/barbers/${userId}`}>Back to profile</Link>
                </Button>
              </div>

              {state.portfolio.data.length > 0 ? (
                <ul
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                  aria-label="Portfolio gallery"
                >
                  {state.portfolio.data.map((photo) => (
                    <li
                      key={photo.id}
                      className="flex flex-col gap-1 rounded-lg border border-border/60 p-1.5"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.caption ?? `${photo.kind} photo`}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {photo.caption ? (
                        <p className="line-clamp-2 px-1 text-xs text-muted-foreground">
                          {photo.caption}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {state.portfolio.meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {state.portfolio.meta.current_page} of{" "}
                    {state.portfolio.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={state.portfolio.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        state.portfolio.meta.current_page >=
                        state.portfolio.meta.last_page
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
