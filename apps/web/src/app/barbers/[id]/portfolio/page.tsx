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
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type BarberState =
  | { kind: "loading" }
  | { kind: "ok"; barber: BarberProfilePublic }
  | { kind: "error"; message: string; notFound?: boolean };

type PortfolioState =
  | { kind: "loading" }
  | { kind: "ok"; portfolio: BarberPortfolioResponse }
  | { kind: "error"; message: string };

const PER_PAGE = 24;

function PortfolioMasonrySkeleton() {
  return (
    <ul
      className="columns-1 gap-5 sm:columns-2 md:columns-3"
      aria-hidden
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <li key={i} className="mb-5 break-inside-avoid">
          <Skeleton
            className={cn(
              "w-full rounded-2xl",
              i % 2 === 0 ? "aspect-[4/5]" : "aspect-square",
            )}
          />
        </li>
      ))}
    </ul>
  );
}

type LightboxPayload = {
  url: string;
  alt: string;
  caption: string | null;
} | null;

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
  const [lightbox, setLightbox] = useState<LightboxPayload>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;
    if (lightbox) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [lightbox]);

  const showGallerySkeleton =
    barberState.kind === "loading" ||
    (barberState.kind === "ok" && portfolioState.kind === "loading");

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-6xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title={
              barberState.kind === "ok"
                ? `${barberState.barber.barber.name}`
                : "Portfolio"
            }
            description={
              barberState.kind === "ok" && barberState.barber.title
                ? barberState.barber.title
                : "Cuts and finishes shared with permission."
            }
            className="gap-5 sm:gap-6"
          />

          {showGallerySkeleton ? (
            <div className="space-y-6" role="status" aria-live="polite">
              <span className="sr-only">Loading portfolio…</span>
              <div
                className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6"
                aria-hidden
              >
                <Skeleton className="h-4 w-36 sm:w-44" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
              <PortfolioMasonrySkeleton />
            </div>
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
              <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gallery
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {portfolioState.portfolio.meta.total === 0
                      ? "No photos yet — check back soon."
                      : `${portfolioState.portfolio.meta.total} photo${portfolioState.portfolio.meta.total === 1 ? "" : "s"} · Tap to view full size`}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={`/barbers/${userId}`}>Back to profile</Link>
                </Button>
              </div>

              {portfolioState.portfolio.data.length > 0 ? (
                <ul
                  className="columns-1 gap-5 sm:columns-2 md:columns-3"
                  aria-label="Portfolio gallery"
                >
                  {portfolioState.portfolio.data.map((photo, index) => {
                    const alt =
                      photo.caption ?? `${photo.kind} from portfolio`;

                    return (
                      <li key={photo.id} className="mb-5 break-inside-avoid">
                        <button
                          type="button"
                          className={cn(
                            "group relative w-full overflow-hidden rounded-2xl bg-muted/25 text-left ring-1 ring-border/45 outline-none transition-[box-shadow,transform] dark:bg-muted/15",
                            "hover:ring-primary/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "motion-safe:active:scale-[0.995]",
                          )}
                          onClick={() =>
                            setLightbox({
                              url: photo.url,
                              alt,
                              caption: photo.caption ?? null,
                            })
                          }
                          aria-label={
                            photo.caption
                              ? `Open full size: ${photo.caption}`
                              : "Open photo full size"
                          }
                        >
                          <div
                            className={cn(
                              "relative w-full overflow-hidden",
                              index % 2 === 0
                                ? "aspect-[4/5]"
                                : "aspect-square",
                            )}
                          >
                            <Image
                              src={photo.url}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 28vw, (min-width: 768px) 32vw, (min-width: 640px) 45vw, 88vw"
                              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
                              priority={index < 4 && page === 1}
                              aria-hidden
                            />
                          </div>
                          {photo.caption ? (
                            <p className="line-clamp-2 px-3 py-2.5 text-xs leading-snug text-muted-foreground">
                              {photo.caption}
                            </p>
                          ) : (
                            <span className="sr-only">{alt}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {portfolioState.portfolio.meta.last_page > 1 ? (
                <nav
                  className="flex flex-col gap-4 border-t border-border/35 pt-6 sm:flex-row sm:items-center sm:justify-between"
                  aria-label="Portfolio pages"
                >
                  <p className="text-sm text-muted-foreground">
                    Page {portfolioState.portfolio.meta.current_page} of{" "}
                    {portfolioState.portfolio.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 touch-manipulation sm:min-h-9"
                      disabled={portfolioState.portfolio.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 touch-manipulation sm:min-h-9"
                      disabled={
                        portfolioState.portfolio.meta.current_page >=
                        portfolioState.portfolio.meta.last_page
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              ) : null}
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
          </p>

          <dialog
            ref={lightboxRef}
            onClose={() => setLightbox(null)}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                lightboxRef.current?.close();
              }
            }}
            className={cn(
              "fixed left-1/2 top-1/2 z-[100] w-[min(100vw-1rem,52rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl open:flex open:max-h-[min(94dvh,56rem)] open:flex-col",
              "[&::backdrop]:bg-background/75 [&::backdrop]:backdrop-blur-[2px] dark:[&::backdrop]:bg-background/88",
            )}
          >
            <div className="flex min-h-0 max-h-[min(94dvh,56rem)] flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/45 px-2 py-2 sm:px-3">
                <p className="min-w-0 truncate px-2 text-xs text-muted-foreground sm:text-sm">
                  {lightbox?.caption ?? "\u00a0"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close viewer"
                  onClick={() => lightboxRef.current?.close()}
                >
                  <X className="size-5" aria-hidden />
                </Button>
              </div>
              <div className="relative min-h-0 flex-1 bg-muted/20 p-2 sm:p-4">
                <div className="relative mx-auto h-[min(78dvh,48rem)] w-full max-w-full">
                  {lightbox ? (
                    <Image
                      src={lightbox.url}
                      alt={lightbox.alt}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 52rem"
                      priority
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </dialog>
        </div>
      </main>
    </div>
  );
}
