"use client";

import { brandStackGap, type BrandStackGap } from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type BrandStackProps = {
  gap?: BrandStackGap;
  className?: string;
  children: ReactNode;
};

/** Vertical rhythm between major page blocks. */
export function BrandStack({ gap = "md", className, children }: BrandStackProps) {
  return (
    <div className={cn("flex flex-col", brandStackGap[gap], className)}>
      {children}
    </div>
  );
}
