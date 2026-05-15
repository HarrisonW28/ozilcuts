"use client";

import { ReadinessSectionHeader } from "@/components/readiness/readiness-section-header";
import { ReadinessThumbStrip } from "@/components/readiness/readiness-thumb-strip";
import {
  profileThumbsFromPhotos,
  type LoadSlice,
} from "@/lib/barber-readiness";
import type { HairProfilePhoto } from "@ozilcuts/types";
import { Scissors } from "lucide-react";

type ReadinessHairReferencesProps = {
  slice: LoadSlice<{ photos: HairProfilePhoto[] }>;
  confirmationBase: string;
};

export function ReadinessHairReferences({
  slice,
  confirmationBase,
}: ReadinessHairReferencesProps) {
  const href = `${confirmationBase}#memory-hair-profile`;
  const count = slice.status === "ok" ? slice.data.photos.length : undefined;
  const thumbs =
    slice.status === "ok" ? profileThumbsFromPhotos(slice.data.photos) : [];

  return (
    <section className="readiness-section-block" aria-labelledby="readiness-hair-refs">
      <h3 id="readiness-hair-refs" className="sr-only">
        Haircut references
      </h3>
      <ReadinessSectionHeader
        icon={<Scissors className="size-3.5" />}
        label="Hair references"
        href={href}
        count={count}
      />
      {slice.status === "error" ? (
        <p className="text-caption text-destructive">{slice.message}</p>
      ) : (
        <ReadinessThumbStrip
          items={thumbs}
          emptyLabel="No reference photos yet."
          href={href}
        />
      )}
    </section>
  );
}
