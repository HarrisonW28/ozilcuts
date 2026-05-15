"use client";

import { getSocialConfig } from "@/lib/social-config";
import { Button, cn } from "@ozilcuts/ui";
import { ArrowUpRight, Images } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type GallerySyncBannerProps = {
  className?: string;
  /** Portfolio page vs marketing home. */
  context?: "home" | "portfolio";
  barberName?: string;
  portfolioHref?: string;
};

/**
 * Explains how on-site galleries relate to social — nudges follow/share without
 * heavy embeds.
 */
export function GallerySyncBanner({
  className,
  context = "home",
  barberName,
  portfolioHref,
}: GallerySyncBannerProps) {
  const config = useMemo(() => getSocialConfig(), []);
  const handle = config.instagramHandle;

  const title =
    context === "portfolio" && barberName
      ? `${barberName.split(" ")[0]}'s portfolio & social`
      : "Gallery & social, in sync";

  const description =
    context === "portfolio"
      ? "Portfolio photos here are shared with client consent. New work often lands on Instagram first — follow for between-visit drops."
      : "Portfolios on Ozilcuts are the canonical set; Instagram carries day-to-day texture between updates.";

  return (
    <aside
      className={cn("social-gallery-sync", className)}
      aria-labelledby="gallery-sync-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15"
            aria-hidden
          >
            <Images className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3
              id="gallery-sync-heading"
              className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {handle ? (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Tip: tag{" "}
                <span className="text-foreground">@{handle}</span> when you share
                your cut.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:items-end">
          {portfolioHref ? (
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:w-auto"
            >
              <Link href={portfolioHref}>On-site gallery</Link>
            </Button>
          ) : null}
          {config.instagramProfileUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:w-auto"
            >
              <Link
                href={config.instagramProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {handle ? `Follow @${handle}` : "Follow on Instagram"}
                <ArrowUpRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
