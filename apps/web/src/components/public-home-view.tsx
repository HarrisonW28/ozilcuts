"use client";

import { ContactLocationSection } from "@/components/contact-location-section";
import {
  HomeAmbientVideoPanel,
  HomeCinematicHero,
  HomeMotionSection,
} from "@/components/home";
import { SiteBrandMark } from "@/components/site-brand-mark";
import {
  GallerySyncBanner,
  InstagramSection,
  SocialLinksStrip,
  SocialProofBand,
} from "@/components/social";
import {
  heroBundleHasVideo,
  resolveAmbientBundle,
  type HomeVideoSources,
} from "@/lib/home-video-config";
import { formatGbp } from "@/lib/format-gbp";
import { publicReviewQuotes } from "@/lib/public-site-copy";
import { hasStoredAuthSession } from "@/lib/use-session-profile";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import type { BarberProfilePublic, ServiceSummary } from "@ozilcuts/types";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

type HealthCopy = {
  line: ReactNode | null;
  showRetry: boolean;
  onRetry: () => void;
};

type PublicHomeViewProps = {
  heroTitle: string;
  heroDescription: ReactNode;
  profileGuest: boolean;
  profilePending?: boolean;
  profileReady: boolean;
  servicesPreview: ServiceSummary[];
  barbersPreview: BarberProfilePublic[];
  previewsLoading: boolean;
  health: HealthCopy;
  videoSources?: HomeVideoSources;
  instagramHandle?: string | null;
};

export function PublicHomeView({
  heroTitle,
  heroDescription,
  profileGuest,
  profilePending = false,
  profileReady,
  servicesPreview,
  barbersPreview,
  previewsLoading,
  health,
  videoSources,
  instagramHandle,
}: PublicHomeViewProps) {
  const socialOverrides = useMemo(
    () =>
      instagramHandle != null && instagramHandle !== ""
        ? { instagramHandle }
        : undefined,
    [instagramHandle],
  );
  const showAmbientVideo = useMemo(() => {
    if (!videoSources) return false;
    const bundle = resolveAmbientBundle(videoSources);
    return bundle !== null && heroBundleHasVideo(bundle);
  }, [videoSources]);
  const showGuestActions =
    profileGuest || (profilePending && !hasStoredAuthSession());
  const showMemberActions =
    profileReady || (profilePending && hasStoredAuthSession());

  return (
    <div className="space-y-16 md:space-y-24 lg:space-y-28">
      <section
        className="home-hero-bleed scroll-mt-28"
        aria-labelledby="home-hero-heading"
      >
        <HomeCinematicHero videoSources={videoSources}>
          <div className="home-cinematic-hero-content flex min-h-0 flex-1 flex-col justify-end">
            <div className="mx-auto w-full max-w-6xl px-4 pb-11 pt-11 sm:px-6 sm:pb-14 sm:pt-14 md:px-8 md:pb-16 md:pt-16 lg:pb-20 lg:pt-[5.5rem]">
              <div className="grid gap-8 sm:gap-10 md:grid-cols-[minmax(0,1fr)_minmax(11.5rem,14rem)] md:items-end md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)] lg:gap-16">
            <div>
              {profilePending ? (
                <div
                  className="space-y-4"
                  aria-busy="true"
                  aria-labelledby="home-hero-heading"
                >
                  <h1 id="home-hero-heading" className="sr-only">
                    Home
                  </h1>
                  <Skeleton className="home-hero-logo h-16 w-48 max-w-full rounded-lg sm:h-20 sm:w-56" />
                  <Skeleton className="h-12 w-[min(100%,22rem)] rounded-lg sm:h-14" />
                  <Skeleton className="h-20 w-full max-w-xl rounded-lg" />
                </div>
              ) : (
                <>
                  <Link
                    href="/"
                    aria-label="Home"
                    className="home-hero-logo motion-interactive inline-flex touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <SiteBrandMark variant="site" size="large" />
                  </Link>
                  <h1
                    id="home-hero-heading"
                    className="text-balance text-[2.35rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl sm:tracking-tight md:text-6xl lg:text-[3.45rem]"
                  >
                    {heroTitle}
                  </h1>
                  <div className="mt-5 max-w-xl text-pretty text-base leading-snug text-muted-foreground sm:mt-6 sm:text-lg sm:leading-relaxed">
                    {heroDescription}
                  </div>
                </>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
                  <Button
                asChild
                size="lg"
                className="home-hero-cta home-hero-cta--solid h-12 w-full text-base sm:h-[3.25rem] sm:text-[1.0625rem] md:w-full"
              >
                <Link href="/book">Book now</Link>
              </Button>
              {showGuestActions ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="home-hero-cta h-12 w-full text-base sm:h-[3.25rem] sm:text-[1.0625rem] md:w-full"
                  >
                    <Link href="/register">Create account</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="home-hero-cta home-hero-cta--ghost h-12 w-full text-base sm:h-[3.25rem] sm:text-[1.0625rem] md:w-full"
                  >
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              ) : null}
              {showMemberActions ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="home-hero-cta h-12 w-full text-base sm:h-[3.25rem] sm:text-[1.0625rem] md:w-full"
                >
                  <Link href="/appointments">My appointments</Link>
                </Button>
              ) : null}
            </div>
              </div>
            </div>
          </div>
        </HomeCinematicHero>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-16 px-4 sm:px-6 md:space-y-24 md:px-8 lg:space-y-28">
      {/* Quick booking — high-conversion band */}
      <HomeMotionSection
        id="quick-book"
        className="scroll-mt-28"
        aria-labelledby="quick-book-heading"
      >
        <div className="rounded-2xl bg-primary px-5 py-7 text-primary-foreground shadow-md sm:px-8 sm:py-9 md:px-10 md:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="max-w-xl">
              <p
                id="quick-book-heading"
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/80"
              >
                Quick booking
              </p>
              <p className="mt-2 text-balance text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                Grab an open chair—pick a service, barber, and time in a few
                taps.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:shrink-0">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-12 w-full bg-background text-foreground shadow-sm hover:bg-background/92 sm:h-[3.25rem] md:w-auto md:min-w-[10.5rem]"
              >
                <Link href="/book">Book now</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/12 sm:h-[3.25rem] md:w-auto"
              >
                <Link href="/services">View menu</Link>
              </Button>
            </div>
          </div>
        </div>
      </HomeMotionSection>

      <HomeMotionSection
        id="featured-services"
        className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
        aria-labelledby="home-services-heading"
        aria-busy={previewsLoading}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="home-services-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Featured services
            </h2>
            <p className="mt-2 max-w-md text-sm leading-snug text-muted-foreground sm:text-base">
              Timing and price, upfront—tap to hold your spot.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 self-start">
            <Link href="/services">Full menu</Link>
          </Button>
        </div>
        <ul
          className="mt-8 grid list-none gap-4 sm:grid-cols-2 md:mt-10 md:grid-cols-3 md:gap-5"
          aria-label="Featured services"
        >
          {previewsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={`svc-sk-${i}`}
                  className="flex min-h-36 flex-col gap-3 rounded-2xl border border-border/45 bg-card/35 p-4 ring-1 ring-border/30 motion-safe:transition-[border-color,box-shadow] dark:bg-card/25"
                >
                  <span className="sr-only">Loading service</span>
                  <Skeleton className="h-5 w-[min(100%,14rem)] rounded-md" />
                  <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <Skeleton className="mt-auto h-10 w-full rounded-lg" />
                </li>
              ))
            : null}
          {!previewsLoading && servicesPreview.length === 0 ? (
            <li className="col-span-full rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center text-sm text-muted-foreground">
              Services will appear here when your shop publishes them.
            </li>
          ) : null}
          {!previewsLoading
            ? servicesPreview.map((svc) => (
                <li key={svc.id}>
                  <Card className="h-full border-border/55 shadow-none transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Service
                      </p>
                      <p className="text-lg font-semibold leading-snug tracking-tight text-foreground">
                        {svc.name}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div>
                          <dt className="sr-only">Duration</dt>
                          <dd className="tabular-nums text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {svc.duration_minutes}
                            </span>
                            <span className="text-muted-foreground"> min</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="sr-only">Price</dt>
                          <dd className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
                            {formatGbp(svc.price_cents)}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter className="border-t border-border/45 pt-4">
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/book?service_id=${svc.id}`}>
                          Reserve this
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))
            : null}
        </ul>
      </HomeMotionSection>

      <HomeMotionSection
        id="team"
        className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
        aria-labelledby="home-team-heading"
        aria-busy={previewsLoading}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="home-team-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Barber highlights
            </h2>
            <p className="mt-2 max-w-md text-sm leading-snug text-muted-foreground sm:text-base">
              The people behind the chair—bios and work in one place.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 self-start">
            <Link href="/barbers">Everyone</Link>
          </Button>
        </div>
        <ul
          className="mt-8 grid list-none gap-6 sm:grid-cols-2 md:mt-10 md:grid-cols-3 md:gap-7 lg:gap-8"
          aria-label="Featured barbers"
        >
          {previewsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={`bar-sk-${i}`}
                  className="flex min-h-64 flex-col gap-3 rounded-2xl border border-border/45 bg-card/35 p-4 ring-1 ring-border/30 motion-safe:transition-[border-color,box-shadow] dark:bg-card/25"
                >
                  <span className="sr-only">Loading barber</span>
                  <div className="flex gap-3">
                    <Skeleton className="size-16 shrink-0 rounded-2xl sm:size-20" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-[min(100%,12rem)] rounded-md" />
                      <Skeleton className="h-3 w-full max-w-xs rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full flex-1 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </li>
              ))
            : null}
          {!previewsLoading && barbersPreview.length === 0 ? (
            <li className="col-span-full rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center text-sm text-muted-foreground">
              Barber profiles will appear here once they are published.
            </li>
          ) : null}
          {!previewsLoading
            ? barbersPreview.map((row) => (
                <li key={row.id} className="min-w-0">
                  <Card className="h-full min-w-0 overflow-hidden border-border/55 shadow-none transition-shadow hover:shadow-md">
                    <div className="border-b border-border/40 bg-gradient-to-b from-muted/50 to-muted/20 px-5 py-8 dark:from-muted/25 dark:to-muted/10">
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground/90">
                        {initialsFromName(row.barber.name)}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Barber
                      </p>
                    </div>
                    <CardHeader className="pb-2 pt-5">
                      <p className="text-lg font-semibold leading-snug tracking-tight">
                        <Link
                          href={`/barbers/${row.barber.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.barber.name}
                        </Link>
                      </p>
                      {row.title ? (
                        <p className="text-sm text-muted-foreground">
                          {row.title}
                        </p>
                      ) : null}
                    </CardHeader>
                    <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/45 p-4 pt-4">
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
              ))
            : null}
        </ul>
      </HomeMotionSection>

      <HomeMotionSection
        id="gallery"
        className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
        aria-labelledby="home-gallery-heading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="home-gallery-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Visual gallery
            </h2>
            <p className="mt-2 max-w-md text-sm leading-snug text-muted-foreground sm:text-base">
              Real work from the floor—open any portfolio for the full set.
            </p>
          </div>
          <Button asChild className="shrink-0 self-start">
            <Link href="/barbers">Browse portfolios</Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4 md:gap-5">
          {showAmbientVideo ? (
            <div
              className={cn(
                "motion-enter relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-border/50 transition-[transform,box-shadow] motion-safe:duration-300",
                "hover:ring-primary/35 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]",
              )}
            >
              <HomeAmbientVideoPanel
                sources={videoSources}
                className="h-full w-full min-h-[8rem]"
              />
              <span className="pointer-events-none absolute inset-x-3 bottom-3 z-10 text-[10px] font-medium uppercase tracking-wider text-foreground/55">
                Ambient loop
              </span>
            </div>
          ) : null}
          {[
            "from-muted/55 to-muted/20 dark:from-muted/35 dark:to-muted/10",
            "from-primary/[0.07] to-muted/25 dark:from-primary/[0.12] dark:to-muted/15",
            "from-muted/45 to-primary/[0.06] dark:from-muted/30 dark:to-primary/[0.08]",
            "from-muted/50 to-muted/15 dark:from-muted/25 dark:to-muted/8",
          ].map((grad, i) => (
            <div
              key={grad}
              className={cn(
                "motion-enter relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br ring-1 ring-border/50 transition-[transform,box-shadow] motion-safe:duration-300",
                "hover:ring-primary/35 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99]",
                grad,
              )}
            >
              <span className="absolute inset-x-3 bottom-3 text-[10px] font-medium uppercase tracking-wider text-foreground/45">
                {i % 2 === 0 ? "Fade" : "Texture"}
              </span>
            </div>
          ))}
        </div>
        <GallerySyncBanner className="mt-8 sm:mt-10" context="home" />
      </HomeMotionSection>

      <HomeMotionSection
        id="social"
        className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
      >
        <InstagramSection socialOverrides={socialOverrides} />
      </HomeMotionSection>

      <HomeMotionSection
        id="reviews"
        className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
        aria-labelledby="home-reviews-heading"
      >
        <SocialProofBand className="mb-10 md:mb-12" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Reviews
        </p>
        <h2
          id="home-reviews-heading"
          className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Guests who value the details
        </h2>
        <ul className="mt-8 grid list-none gap-8 md:mt-10 md:grid-cols-2 md:gap-10 lg:gap-12">
          {publicReviewQuotes.map((r) => (
            <li key={r.cite}>
              <blockquote className="border-l-2 border-primary/35 pl-6 dark:border-primary/45">
                <p className="text-lg leading-relaxed text-foreground sm:text-xl">
                  “{r.quote}”
                </p>
                <footer className="mt-4 text-sm font-medium text-muted-foreground">
                  {r.cite}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </HomeMotionSection>

      <HomeMotionSection className="scroll-mt-16 md:scroll-mt-20">
        <ContactLocationSection />
      </HomeMotionSection>

      <footer className="border-t border-border/45 pt-8 md:pt-10">
        <SocialLinksStrip className="mb-6" socialOverrides={socialOverrides} />
        {health.line || health.showRetry ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {health.line ? (
              <p
                className="max-w-xl text-xs leading-relaxed text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {health.line}
              </p>
            ) : (
              <span className="sr-only" role="status">
                Connection issue
              </span>
            )}
            {health.showRetry ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 self-start"
                onClick={health.onRetry}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
      </footer>
      </div>
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}
