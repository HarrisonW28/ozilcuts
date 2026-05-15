"use client";

import { brandTypography } from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type BrandEyebrowProps = {
  children: ReactNode;
  className?: string;
  as?: "p" | "span";
};

/** Uppercase section label — editorial rhythm for screens and cards. */
export function BrandEyebrow({
  children,
  className,
  as: Tag = "p",
}: BrandEyebrowProps) {
  return (
    <Tag className={cn(brandTypography.eyebrow, className)}>{children}</Tag>
  );
}
