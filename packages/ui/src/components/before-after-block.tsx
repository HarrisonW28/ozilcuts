import type { ReactNode } from "react";

import { cn } from "../lib/utils";

import { EditorialImageFrame } from "./editorial-image-frame";
import { Surface } from "./surface";

export type BeforeAfterBlockProps = {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  caption?: ReactNode;
  className?: string;
};

function BeforeAfterBlock({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  caption,
  className,
}: BeforeAfterBlockProps) {
  return (
    <Surface
      data-slot="before-after-block"
      elevation="quiet"
      padding="md"
      className={cn("space-y-4", className)}
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <figure className="space-y-2">
          <figcaption className="text-caption font-semibold uppercase tracking-widecaps text-muted-foreground">
            {beforeLabel}
          </figcaption>
          <EditorialImageFrame ratio="portrait" tone="elevated">
            {before}
          </EditorialImageFrame>
        </figure>
        <figure className="space-y-2">
          <figcaption className="text-caption font-semibold uppercase tracking-widecaps text-muted-foreground">
            {afterLabel}
          </figcaption>
          <EditorialImageFrame ratio="portrait" tone="elevated">
            {after}
          </EditorialImageFrame>
        </figure>
      </div>
      {caption ? (
        <p className="text-body text-muted-foreground sm:text-body-lg">
          {caption}
        </p>
      ) : null}
    </Surface>
  );
}

export { BeforeAfterBlock };
