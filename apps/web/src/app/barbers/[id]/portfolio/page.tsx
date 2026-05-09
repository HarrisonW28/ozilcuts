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
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type BarberState =
  | { kind: "loading" }
  | { kind: "ok"; barber: BarberProfilePublic }
  | { kind: "error"; message: string; notFound?: boolean };

type PortfolioState =
  | { kind: "loading" }
  | { kind: "ok"; portfolio: BarberPortfolioResponse }
  | { kind: "error"; message: string };

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
  const [barberState, setBarberState] = useState<BarberState>({
    kind: "loading",
  });
  const [portfolioState, setPortfolioState] = useState<PortfolioState>({
    kind: "loading",
  });
  const [page, setPage] = useState(1);

  const loadBarber = useCallback(async () => {
    if (!Number.isFinite(userId) || userId < 1) {
      setBarberState({ kind: "error", message: "Invalid portfolio link." });

      return;
    }
    setBarberState({ kind: "loading" });
    try {
      const barber = await fetchBarber(userId);
      setBarberState({ kind: "ok", barber });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setBarberState({
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
      setBarberState({ kind: "error", message });
    }
  }, [userId]);

  const loadPortfolio = useCallback(async () => {
    if (!Number.isFinite(userId) || userId < 1) return;
    setPortfolioState({ kind: "loading" });
    try {
      const portfolio = await fetchBarberPortfolio(userId, page, PER_PAGE);
      setPortfolioState({ kind: "ok", portfolio });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load portfolio photos.";
      setPortfolioState({ kind: "error", message });
    }
  }, [userId, page]);

  useEffect(() => {
    setPage(1);
    void loadBarber();
  }, [loadBarber]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

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
                ? `${barberState.barber.barber.name} — Portfolio`
                : "Portfolio"
            }
            description={
              barberState.kind === "ok" && barberState.barber.title
                ? barberState.barber.title
                : "Recent cuts shared with permission."
            }
          />

          {barberState.kind === "loading" ||
          (barberState.kind === "ok" && portfolioState.kind === "loading") ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading portfolio…
            </p>
          ) : null}

          {barberState.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {barberState.notFound
                    ? "Not found"
                    : "Couldn’t load portfolio"}
                </CardTitle>
                <CardDescription>{barberState.message}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                {barberState.notFound ? (
                  <Button asChild variant="outline">
                    <Link href="/barbers">All barbers</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void loadBarber()}
                  >
                    Retry
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : null}

          {barberState.kind === "ok" && portfolioState.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn’t load photos</CardTitle>
                <CardDescription>{portfolioState.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void loadPortfolio()}
                >
                  Retry
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {barberState.kind === "ok" && portfolioState.kind === "ok" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {portfolioState.portfolio.meta.total === 0
                    ? "No photos yet — check back soon."
                    : `${portfolioState.portfolio.meta.total} photo${portfolioState.portfolio.meta.total === 1 ? "" : "s"}`}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/barbers/${userId}`}>Back to profile</Link>
                </Button>
              </div>

              {portfolioState.portfolio.data.length > 0 ? (
                <ul
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                  aria-label="Portfolio gallery"
                >
                  {portfolioState.portfolio.data.map((photo, index) => (
                    <li
                      key={photo.id}
                      className="flex flex-col gap-1 rounded-lg border border-border/60 p-1.5"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/40">
                        <Image
                          src={photo.url}
                          alt={photo.caption ?? `${photo.kind} photo`}
                          fill
                          sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className="object-cover"
                          priority={index < 4 && page === 1}
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

              {portfolioState.portfolio.meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {portfolioState.portfolio.meta.current_page} of{" "}
                    {portfolioState.portfolio.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={portfolioState.portfolio.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        portfolioState.portfolio.meta.current_page >=
                        portfolioState.portfolio.meta.last_page
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
