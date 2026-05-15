"use client";

import { BrandEyebrow } from "@/components/brand/brand-eyebrow";
import { BrandMotion } from "@/components/brand/brand-motion";
import { BrandText } from "@/components/brand/brand-text";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type BrandScreenHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  className?: string;
};

/**
 * Screen title block using the brand typography scale (alternative to `@ozilcuts/ui` ScreenTitle).
 */
export function BrandScreenHeader({
  eyebrow,
  title,
  description,
  className,
}: BrandScreenHeaderProps) {
  return (
    <BrandMotion variant="enter" className={cn("flex flex-col gap-4", className)}>
      <BrandEyebrow>{eyebrow}</BrandEyebrow>
      <BrandText variant="display" as="h1" className="text-foreground">
        {title}
      </BrandText>
      {description ? (
        <BrandText
          variant="bodyLg"
          className="max-w-2xl text-muted-foreground"
        >
          {description}
        </BrandText>
      ) : null}
    </BrandMotion>
  );
}
