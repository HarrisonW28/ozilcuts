"use client";

import { ReadinessSectionHeader } from "@/components/readiness/readiness-section-header";
import { ReadinessThumbStrip } from "@/components/readiness/readiness-thumb-strip";
import { visitThumbsFromPhotos, type LoadSlice } from "@/lib/barber-readiness";
import type { HaircutPhoto } from "@ozilcuts/types";
import { Camera } from "lucide-react";

type ReadinessVisitPhotosProps = {
  slice: LoadSlice<HaircutPhoto[]>;
  confirmationBase: string;
};

export function ReadinessVisitPhotos({
  slice,
  confirmationBase,
}: ReadinessVisitPhotosProps) {
  const href = `${confirmationBase}#memory-visit-photos`;
  const count = slice.status === "ok" ? slice.data.length : undefined;
  const thumbs = slice.status === "ok" ? visitThumbsFromPhotos(slice.data) : [];

  return (
    <section
      className="readiness-section-block"
      aria-labelledby="readiness-visit-photos"
    >
      <h3 id="readiness-visit-photos" className="sr-only">
        Haircut photos for this visit
      </h3>
      <ReadinessSectionHeader
        icon={<Camera className="size-3.5" />}
        label="This visit’s photos"
        href={href}
        count={count}
      />
      {slice.status === "error" ? (
        <p className="text-caption text-destructive">{slice.message}</p>
      ) : (
        <ReadinessThumbStrip
          items={thumbs}
          emptyLabel="No photos for this booking yet."
          href={href}
        />
      )}
    </section>
  );
}
