"use client";

import {
  kindBadgeClasses,
  masonryAspectClass,
  masonryAspectForIndex,
  masonryImageSizes,
  portfolioPhotoAlt,
} from "@/lib/content-photography";
import type { HaircutPhoto } from "@ozilcuts/types";
import { GalleryTile, cn } from "@ozilcuts/ui";
import Image from "next/image";

type GalleryPhotoTileProps = {
  photo: HaircutPhoto;
  index: number;
  barberName?: string;
  priority?: boolean;
  onOpen: (url: string, alt: string, caption: string | null) => void;
};

export function GalleryPhotoTile({
  photo,
  index,
  barberName,
  priority,
  onOpen,
}: GalleryPhotoTileProps) {
  const aspect = masonryAspectForIndex(index);
  const alt = portfolioPhotoAlt(photo, barberName);
  const isWide = aspect === "wide";

  return (
    <GalleryTile
      type="button"
      className="shadow-xs dark:shadow-none"
      onClick={() => onOpen(photo.url, alt, photo.caption ?? null)}
      aria-label={photo.caption ? `Open full size: ${photo.caption}` : "Open photo full size"}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          masonryAspectClass(aspect),
        )}
      >
        <Image
          src={photo.url}
          alt=""
          fill
          sizes={masonryImageSizes(aspect, isWide)}
          className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/gallery-tile:scale-[1.03]"
          priority={priority}
          aria-hidden
        />
        <span
          className={cn("content-photo-badge", kindBadgeClasses(photo.kind))}
          aria-hidden
        >
          {photo.kind === "before" ? "Before" : "After"}
        </span>
      </div>
      {photo.caption ? (
        <p className="line-clamp-2 px-3 py-2.5 text-caption leading-snug text-muted-foreground">
          {photo.caption}
        </p>
      ) : (
        <span className="sr-only">{alt}</span>
      )}
    </GalleryTile>
  );
}
