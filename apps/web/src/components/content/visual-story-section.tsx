"use client";

import { BrandMotion } from "@/components/brand";
import { StoryBand } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type VisualStorySectionProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  visual?: ReactNode;
  visualFirst?: boolean;
  footer?: ReactNode;
  className?: string;
};

/** Editorial copy + optional photography slot for trust-building narratives. */
export function VisualStorySection({
  eyebrow,
  title,
  description,
  visual,
  visualFirst,
  footer,
  className,
}: VisualStorySectionProps) {
  return (
    <BrandMotion variant="enter">
      <StoryBand
        eyebrow={eyebrow}
        title={title}
        description={description}
        visual={visual}
        visualFirst={visualFirst}
        footer={footer}
        className={className}
      />
    </BrandMotion>
  );
}
