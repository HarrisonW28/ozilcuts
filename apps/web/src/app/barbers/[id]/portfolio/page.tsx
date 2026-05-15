"use client";

import {
  ContentSectionHeader,
  PhotoLightbox,
  PhotographyGallerySkeleton,
  PhotographyMasonryGallery,
  VisualStorySection,
} from "@/components/content";
import { GallerySyncBanner } from "@/components/social";
import { SiteHeader } from "@/components/site-header";
import { layoutPortfolioPhotos } from "@/lib/content-photography";
import type { LightboxPayload } from "@/lib/content-photography";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchBarber, fetchBarberPortfolio } from "@ozilcuts/api";
import type { BarberProfilePublic, BarberPortfolioResponse } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  ScreenTitle,
  Skeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [lightbox, setLightbox] = useState<LightboxPayload | null>(null);

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

  const galleryItems = useMemo(() => {
    if (portfolioState.kind !== "ok") return [];
    return layoutPortfolioPhotos(portfolioState.portfolio.data);
  }, [portfolioState]);

  const barberName =
    barberState.kind === "ok" ? barberState.barber.barber.name : undefined;

  const showGallerySkeleton =
    barberState.kind === "loading" ||
    (barberState.kind === "ok" && portfolioState.kind === "loading");

  const openPhoto = useCallback(
    (url: string, alt: string, caption: string | null) => {
      setLightbox({ url, alt, caption });
    },
    [],
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main id="main-content" className="page-main">
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

          {barberState.kind === "ok" ? (
            <VisualStorySection
              eyebrow="Visual trust"
              title="Photography you can believe in"
              description="Every image here is published with client consent. Before and after pairs are shown together so you can see the full story — not just the highlight reel."
              className="mt-2"
            />
          ) : null}

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
              <PhotographyGallerySkeleton />
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
              <ContentSectionHeader
                eyebrow="Gallery"
                title="Portfolio"
                description={
                  portfolioState.portfolio.meta.total === 0
                    ? "No photos yet — check back soon."
                    : `${portfolioState.portfolio.meta.total} photo${portfolioState.portfolio.meta.total === 1 ? "" : "s"} · Tap any image for full size`
                }
                action={
                  <Button asChild variant="outline" size="sm" className="shrink-0 min-h-11 touch-manipulation sm:min-h-9">
                    <Link href={`/barbers/${userId}`}>Back to profile</Link>
                  </Button>
                }
              />

              <GallerySyncBanner
                className="mt-6"
                context="portfolio"
                barberName={barberName}
                portfolioHref={`/barbers/${userId}/portfolio`}
              />

              {portfolioState.portfolio.data.length > 0 ? (
                <PhotographyMasonryGallery
                  items={galleryItems}
                  barberName={barberName}
                  page={page}
                  onOpenPhoto={openPhoto}
                />
              ) : (
                <EmptyState
                  title="Portfolio coming soon"
                  description="This barber hasn’t published any photos yet. Check back later or book a visit to see their work in person."
                  action={
                    <Button asChild variant="outline" size="sm" className="min-h-11 touch-manipulation">
                      <Link href={`/barbers/${userId}`}>Back to profile</Link>
                    </Button>
                  }
                />
              )}

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

          <PhotoLightbox
            payload={lightbox}
            onClose={() => setLightbox(null)}
          />
        </div>
      </main>
    </div>
  );
}
