import type { ReactNode } from "react";

import { cn } from "../lib/utils";

import { Surface } from "./surface";

export type StoryBandProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Visual slot — photography, collage, or illustration. */
  visual?: ReactNode;
  /** When set with `visual`, reverses copy / visual on large screens. */
  visualFirst?: boolean;
  footer?: ReactNode;
  className?: string;
};

function StoryBand({
  eyebrow,
  title,
  description,
  visual,
  visualFirst,
  footer,
  className,
}: StoryBandProps) {
  const copy = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
      <p className="text-caption font-semibold uppercase tracking-widecaps text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="text-title-lg font-semibold tracking-editorial text-foreground">
        {title}
      </h2>
      {description ? (
        <div className="max-w-xl text-body leading-body text-muted-foreground sm:text-body-lg">
          {description}
        </div>
      ) : null}
      {footer ? <div className="pt-1">{footer}</div> : null}
    </div>
  );

  const visualBlock =
    visual != null ? (
      <div className="min-w-0 shrink-0 lg:w-[min(100%,28rem)]">{visual}</div>
    ) : null;

  return (
    <Surface
      data-slot="story-band"
      elevation="quiet"
      padding="lg"
      className={cn(
        visual != null
          ? "flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12"
          : "",
        visualFirst && visual != null ? "lg:flex-row-reverse" : "",
        className,
      )}
    >
      {visual != null ? (
        <>
          {copy}
          {visualBlock}
        </>
      ) : (
        copy
      )}
    </Surface>
  );
}

export { StoryBand };
