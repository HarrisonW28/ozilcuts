"use client";

import type { InstagramHighlight } from "@/lib/social-config";
import { cn } from "@ozilcuts/ui";
import { InstagramIcon } from "@/components/social/instagram-icon";
import Image from "next/image";

type InstagramHighlightTileProps = {
  highlight: InstagramHighlight;
  className?: string;
};

export function InstagramHighlightTile({
  highlight,
  className,
}: InstagramHighlightTileProps) {
  const useImage =
    highlight.imageUrl &&
    (highlight.imageUrl.startsWith("/") ||
      highlight.imageUrl.startsWith("https://"));

  return (
    <a
      href={highlight.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("social-highlight-tile touch-manipulation", className)}
    >
      {useImage ? (
        <Image
          src={highlight.imageUrl!}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 44vw, 14rem"
          aria-hidden
        />
      ) : (
        <div className="social-highlight-gradient" aria-hidden />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex items-center justify-between gap-2 p-3">
        <span className="text-sm font-semibold text-foreground">
          {highlight.label}
        </span>
        <InstagramIcon className="size-4 shrink-0 text-foreground/70" />
      </div>
      <span className="sr-only">View {highlight.label} on Instagram</span>
    </a>
  );
}
