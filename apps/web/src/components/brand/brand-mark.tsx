"use client";

import { cn } from "@ozilcuts/ui";
import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  href?: string;
  /** Compact for shell headers; default for marketing. */
  size?: "sm" | "md";
};

/**
 * In-app wordmark — theme-aware (unlike PWA `BrandIconJsx` which is bitmap-only).
 */
export function BrandMark({ className, href, size = "md" }: BrandMarkProps) {
  const box =
    size === "sm"
      ? "size-8 rounded-lg text-xs"
      : "size-10 rounded-xl text-sm";

  const inner = (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-primary font-bold tracking-ui text-primary-foreground",
        box,
        className,
      )}
      aria-hidden
    >
      OC
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {inner}
        <span className="sr-only">Ozil Cuts home</span>
      </Link>
    );
  }

  return inner;
}
