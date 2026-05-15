"use client";

import { brandIconSize, type BrandIconSize } from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type BrandGlyphProps = {
  icon: LucideIcon;
  size?: BrandIconSize;
  strokeWidth?: number;
  className?: string;
  label?: string;
} & Omit<ComponentProps<"svg">, "ref">;

/**
 * Lucide icons with consistent size and stroke from the brand system.
 */
export function BrandGlyph({
  icon: Icon,
  size = "md",
  strokeWidth,
  className,
  label,
  ...props
}: BrandGlyphProps) {
  const stroke =
    strokeWidth ?? (size === "lg" || size === "xl" || size === "2xl" ? 1.75 : 1.75);

  return (
    <Icon
      className={cn("shrink-0", brandIconSize[size], className)}
      strokeWidth={stroke}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      {...props}
    />
  );
}
