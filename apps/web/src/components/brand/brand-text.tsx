"use client";

import {
  brandTypography,
  type BrandTypographyVariant,
} from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { ElementType, ReactNode } from "react";

type BrandTextProps = {
  variant?: BrandTypographyVariant;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

/**
 * Typography scale — display through micro, aligned to brand tokens.
 */
export function BrandText({
  variant = "body",
  as,
  className,
  children,
}: BrandTextProps) {
  const Component =
    as ??
    (variant === "display" || variant === "titleLg" || variant === "title"
      ? "h2"
      : variant === "eyebrow"
        ? "p"
        : "p");

  return (
    <Component className={cn(brandTypography[variant], className)}>
      {children}
    </Component>
  );
}
