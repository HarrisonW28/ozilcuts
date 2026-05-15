"use client";

import type { ReadinessThumb } from "@/lib/barber-readiness";
import Link from "next/link";

type ReadinessThumbStripProps = {
  items: ReadinessThumb[];
  emptyLabel: string;
  href: string;
};

export function ReadinessThumbStrip({
  items,
  emptyLabel,
  href,
}: ReadinessThumbStripProps) {
  if (items.length === 0) {
    return <p className="text-caption text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div
      className="readiness-thumb-strip"
      role="list"
      aria-label="Photo thumbnails"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={href}
          className="readiness-thumb"
          role="listitem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- API-hosted staff thumbnails */}
          <img
            src={item.url}
            alt={item.alt}
            className="readiness-thumb-img"
            loading="lazy"
            decoding="async"
          />
        </Link>
      ))}
    </div>
  );
}
