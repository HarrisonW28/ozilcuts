"use client";

import { VisitLocationMap } from "@/components/visit-location-map";
import { SocialLinksStrip } from "@/components/social";
import { WeeklyHoursDisplay } from "@/components/weekly-hours-display";
import { useShopBranding } from "@/lib/shop-branding-context";
import {
  publicShopHoursRows,
  publicStudioLocationCopy,
} from "@/lib/public-site-copy";
import { weekdaysFromShopAdminPayload } from "@/lib/shop-default-hours";
import { Button } from "@ozilcuts/ui";
import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function ContactLocationSection() {
  const { branding } = useShopBranding();

  const locationTitle =
    branding?.shop_display_name?.trim() ||
    publicStudioLocationCopy.title;
  const locationBody =
    branding?.shop_visit_note?.trim() ||
    publicStudioLocationCopy.body;
  const publicAddress = branding?.shop_public_address?.trim() || null;

  const hoursWeekdays = useMemo(() => {
    if (branding?.shop_hours?.weekdays?.length) {
      return weekdaysFromShopAdminPayload(branding.shop_hours);
    }
    return null;
  }, [branding?.shop_hours]);

  const hasMap =
    branding?.shop_latitude != null && branding?.shop_longitude != null;

  return (
    <section
      id="visit"
      className="scroll-mt-28 border-t border-border/35 pt-16 dark:border-border/25 md:pt-20"
      aria-labelledby="home-visit-heading"
    >
      <div className="grid gap-10 rounded-2xl border border-border/55 bg-muted/[0.08] px-6 py-10 dark:bg-muted/[0.06] sm:px-10 sm:py-12 md:grid-cols-2 md:items-stretch md:gap-12 lg:gap-14">
        <div className="flex flex-col gap-8">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Contact &amp; location
            </p>
            <h2
              id="home-visit-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Plan your visit
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Everything you need lands in your inbox after you book—no guessing
              at the curb.
            </p>
            <SocialLinksStrip className="mt-6" variant="compact" />
          </header>

          <div className="flex gap-4 rounded-2xl border border-border/50 bg-card/70 p-5 shadow-xs dark:bg-card/45">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15"
              aria-hidden
            >
              <MapPin className="size-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {locationTitle}
              </h3>
              {publicAddress ? (
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">
                  {publicAddress}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {locationBody}
              </p>
            </div>
          </div>

          {hasMap ? (
            <VisitLocationMap
              latitude={branding!.shop_latitude!}
              longitude={branding!.shop_longitude!}
              label={`Map for ${locationTitle}`}
            />
          ) : null}

          <div>
            <div className="flex items-center gap-2">
              <Clock
                className="size-4 shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Hours
              </h3>
            </div>
            <WeeklyHoursDisplay
              className="mt-3"
              rows={hoursWeekdays ? undefined : publicShopHoursRows}
              weekdays={hoursWeekdays ?? undefined}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-xl border border-border/50 bg-card/85 p-6 shadow-sm dark:bg-card/50 sm:p-7">
          <p className="text-sm font-medium leading-snug text-foreground">
            Ready when you are
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hold a time, then fine-tune service and barber in the booking flow.
            Menu and team are one tap away if you want to browse first.
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <Button
              asChild
              size="lg"
              className="h-12 w-full text-base shadow-sm sm:h-[3.25rem]"
            >
              <Link href="/book">Book now</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full sm:h-12">
              <Link href="/services">View menu</Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 w-full">
              <Link href="/barbers">Meet the team</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
