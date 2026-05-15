"use client";

import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import type { HairProfilePhoto } from "@ozilcuts/types";
import { EditorialImageFrame, EmptyState } from "@ozilcuts/ui";
import Link from "next/link";

type CustomerHomeGalleryProps = {
  photos: HairProfilePhoto[];
};

export function CustomerHomeGallery({ photos }: CustomerHomeGalleryProps) {
  return (
    <CustomerHomeSection
      id="home-gallery-heading"
      title="Haircut gallery"
      action={{ href: "/profile/hair", label: "Manage" }}
    >
      {photos.length > 0 ? (
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0"
          role="list"
          aria-label="Hair profile photos"
        >
          {photos.map((ph, index) => (
            <Link
              key={ph.id}
              href="/profile/hair"
              role="listitem"
              className="snap-center shrink-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:active:scale-[0.98] motion-safe:hover:scale-[1.02] sm:snap-none"
            >
              <EditorialImageFrame
                ratio="portrait"
                tone={index === 0 ? "elevated" : "default"}
                className={
                  index === 0
                    ? "w-[8.5rem] ring-primary/15 sm:col-span-2 sm:w-full sm:ring-primary/20"
                    : "w-[7.25rem] sm:w-full"
                }
                label={ph.caption ?? "Hair profile photo"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ph.url}
                  alt={ph.caption ? ph.caption : "Hair profile photo"}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </EditorialImageFrame>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No photos yet"
          description="Add reference shots on your hair profile so your barber sees your style."
          className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-10"
          action={
            <Link
              href="/profile/hair"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Add photos
            </Link>
          }
        />
      )}
    </CustomerHomeSection>
  );
}
