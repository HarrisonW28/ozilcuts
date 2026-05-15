"use client";

import { Skeleton, cn } from "@ozilcuts/ui";

type PhotographyGallerySkeletonProps = {
  count?: number;
  className?: string;
};

export function PhotographyGallerySkeleton({
  count = 6,
  className,
}: PhotographyGallerySkeletonProps) {
  return (
    <ul
      className={cn("content-gallery-masonry", className)}
      aria-busy="true"
      aria-label="Loading gallery"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className={cn(i % 3 === 0 ? "sm:col-span-2" : "")}>
          <Skeleton
            className={cn(
              "w-full rounded-2xl",
              i % 3 === 0
                ? "aspect-[21/9]"
                : i % 2 === 0
                  ? "aspect-[4/5]"
                  : "aspect-square",
            )}
          />
        </li>
      ))}
    </ul>
  );
}
