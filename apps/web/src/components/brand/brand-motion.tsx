"use client";

import { brandMotion, brandStaggerDelay } from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { CSSProperties, ReactNode } from "react";

type BrandMotionVariant = keyof typeof brandMotion;

type BrandMotionProps = {
  variant?: BrandMotionVariant;
  /** List index for staggered enter (caps at 8). */
  staggerIndex?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** Applies brand motion utilities with optional stagger delay. */
export function BrandMotion({
  variant = "contentIn",
  staggerIndex,
  className,
  style,
  children,
}: BrandMotionProps) {
  const staggerStyle: CSSProperties | undefined =
    staggerIndex !== undefined
      ? { animationDelay: brandStaggerDelay(staggerIndex) }
      : undefined;

  return (
    <div
      className={cn(brandMotion[variant], className)}
      style={{ ...staggerStyle, ...style }}
    >
      {children}
    </div>
  );
}
