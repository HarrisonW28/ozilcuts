"use client";

import { BeforeAfterShowcase } from "@/components/content/before-after-showcase";
import { GalleryPhotoTile } from "@/components/content/gallery-photo-tile";
import type { PortfolioGalleryItem } from "@/lib/content-photography";
import { cn } from "@ozilcuts/ui";

type PhotographyMasonryGalleryProps = {
  items: PortfolioGalleryItem[];
  barberName?: string;
  page?: number;
  onOpenPhoto: (url: string, alt: string, caption: string | null) => void;
  className?: string;
};

export function PhotographyMasonryGallery({
  items,
  barberName,
  page = 1,
  onOpenPhoto,
  className,
}: PhotographyMasonryGalleryProps) {
  return (
    <ul
      className={cn("content-gallery-masonry", className)}
      aria-label="Portfolio gallery"
    >
      {items.map((item, index) => {
        if (item.type === "pair") {
          const merged = [item.before.caption, item.after.caption]
            .filter(Boolean)
            .join(" · ");
          const pairCaption = merged.length > 0 ? merged : null;

          return (
            <li key={`pair-${item.appointment_id}`} className="sm:col-span-2">
              <BeforeAfterShowcase
                beforeUrl={item.before.url}
                afterUrl={item.after.url}
                beforeCaption={item.before.caption}
                afterCaption={item.after.caption}
                mergedCaption={pairCaption}
                onOpenBefore={() =>
                  onOpenPhoto(
                    item.before.url,
                    item.before.caption ?? "Before — portfolio photo",
                    item.before.caption,
                  )
                }
                onOpenAfter={() =>
                  onOpenPhoto(
                    item.after.url,
                    item.after.caption ?? "After — portfolio photo",
                    item.after.caption,
                  )
                }
              />
            </li>
          );
        }

        const photo = item.photo;
        return (
          <li
            key={photo.id}
            className={cn(index % 5 === 0 ? "sm:col-span-2" : "")}
          >
            <GalleryPhotoTile
              photo={photo}
              index={index}
              barberName={barberName}
              priority={index < 4 && page === 1}
              onOpen={onOpenPhoto}
            />
          </li>
        );
      })}
    </ul>
  );
}
