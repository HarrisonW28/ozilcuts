"use client";

import { portfolioPhotoAlt } from "@/lib/content-photography";
import type { HaircutPhoto } from "@ozilcuts/types";
import { EditorialImageFrame } from "@ozilcuts/ui";
import Image from "next/image";
import Link from "next/link";

type PortfolioPreviewStripProps = {
  photos: HaircutPhoto[];
  barberUserId: number;
  barberName: string;
  heading?: string;
  viewAllLabel?: string;
  className?: string;
};

export function PortfolioPreviewStrip({
  photos,
  barberUserId,
  barberName,
  heading = "On the chair",
  viewAllLabel = "View all",
  className,
}: PortfolioPreviewStripProps) {
  if (photos.length === 0) return null;

  const portfolioHref = `/barbers/${barberUserId}/portfolio`;

  return (
    <section
      className={className}
      aria-labelledby="portfolio-preview-heading"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2
          id="portfolio-preview-heading"
          className="text-title font-semibold tracking-tight text-foreground sm:text-title-lg"
        >
          {heading}
        </h2>
        <Link
          href={portfolioHref}
          className="text-caption font-semibold uppercase tracking-widecaps text-primary underline-offset-4 hover:underline"
        >
          {viewAllLabel}
        </Link>
      </div>
      <div
        className="content-preview-strip"
        role="list"
        aria-label="Recent portfolio photos"
      >
        {photos.map((photo) => {
          const label = portfolioPhotoAlt(photo, barberName);
          return (
            <Link
              key={photo.id}
              href={portfolioHref}
              role="listitem"
              className="group"
            >
              <EditorialImageFrame
                ratio="portrait"
                tone="elevated"
                className="motion-safe:transition-transform motion-safe:duration-brand motion-safe:ease-brand motion-safe:group-hover:scale-[1.02] motion-safe:group-active:scale-[0.99]"
                label={label}
              >
                <Image
                  src={photo.url}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 42vw, 12rem"
                />
              </EditorialImageFrame>
              <p className="mt-2 line-clamp-2 text-caption leading-snug text-muted-foreground">
                {photo.kind === "before" ? "Before" : "After"}
                {photo.caption ? ` · ${photo.caption}` : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
