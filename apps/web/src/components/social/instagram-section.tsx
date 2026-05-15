"use client";

import { InstagramHighlightTile } from "@/components/social/instagram-highlight-tile";
import { getSocialConfig, hasSocialPresence } from "@/lib/social-config";
import { Button, Skeleton, cn } from "@ozilcuts/ui";
import { InstagramIcon } from "@/components/social/instagram-icon";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InstagramSectionProps = {
  className?: string;
  id?: string;
};

/**
 * Lightweight Instagram highlights row — link-out tiles only, no embeds.
 */
export function InstagramSection({ className, id = "instagram" }: InstagramSectionProps) {
  const config = useMemo(() => getSocialConfig(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!hasSocialPresence(config) || !config.instagramProfileUrl) {
    return null;
  }

  const handle = config.instagramHandle;

  return (
    <section
      id={id}
      className={cn("scroll-mt-28", className)}
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Instagram
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            From the chair
          </h2>
          <p className="mt-2 max-w-md text-sm leading-snug text-muted-foreground sm:text-base">
            Daily drops between portfolio updates — follow{" "}
            {handle ? (
              <span className="font-medium text-foreground">@{handle}</span>
            ) : (
              "the studio"
            )}{" "}
            for fades, texture, and studio mood.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 self-start min-h-11 touch-manipulation"
        >
          <Link
            href={config.instagramProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <InstagramIcon className="mr-2 size-4" />
            View profile
          </Link>
        </Button>
      </div>

      {!ready ? (
        <ul
          className="social-instagram-grid mt-8 list-none sm:mt-10"
          aria-hidden
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={`ig-sk-${i}`}>
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className="social-instagram-grid mt-8 list-none sm:mt-10"
          aria-label="Instagram highlights"
        >
          {config.highlights.map((highlight) => (
            <li key={highlight.id}>
              <InstagramHighlightTile highlight={highlight} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
