"use client";

import { useShopBranding } from "@/lib/shop-branding-context";
import { cn } from "@ozilcuts/ui";
import { useEffect, useState } from "react";

type SiteBrandMarkProps = {
  /** Site header shows tagline under wordmark when no custom logo. */
  variant?: "site" | "shell";
  /** Homepage header lockup (~3× default shell height). */
  size?: "default" | "large";
  className?: string;
};

const logoShellClassBySize = {
  default:
    "relative flex h-9 min-h-9 min-w-9 max-h-10 max-w-[10rem] shrink-0 items-center justify-center sm:h-10 sm:min-h-10 sm:min-w-10 sm:max-w-[11rem]",
  large:
    "relative flex h-[4.5rem] min-h-[4.5rem] min-w-[4.5rem] max-h-[6.75rem] max-w-[min(100%,22rem)] shrink-0 items-center justify-center sm:h-[5.5rem] sm:min-h-[5.5rem] sm:min-w-[5.5rem] sm:max-w-[26rem] md:h-[6.75rem] md:min-h-[6.75rem] md:min-w-[6.75rem] md:max-w-[28rem]",
} as const;

/**
 * Header lockup: custom shop logo (square or wide) or wordmark — never a broken image.
 */
export function SiteBrandMark({
  variant = "site",
  size = "default",
  className,
}: SiteBrandMarkProps) {
  const logoShellClass = logoShellClassBySize[size];
  const { logoUrl, status } = useShopBranding();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl) && !failed;
  const showWordmark = !showLogo && status !== "loading";
  const showSkeleton = !showLogo && status === "loading";

  return (
    <span
      className={cn(
        "inline-flex max-w-full",
        showWordmark && variant === "site"
          ? size === "large"
            ? "flex-col items-center gap-0"
            : "flex-col items-start gap-0"
          : "items-center justify-center",
        className,
      )}
    >
      {showLogo ? (
        <span className={logoShellClass} aria-hidden>
          {!loaded ? (
            <span className="absolute inset-0 rounded-md bg-muted/80 motion-reduce:animate-none animate-pulse" />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URLs; avoids optimizer/domain flash */}
          <img
            src={logoUrl!}
            alt=""
            width={120}
            height={120}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className={cn(
              "relative z-[1] max-h-full max-w-full object-contain",
              size === "large" ? "object-center" : "object-left",
              !loaded && "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </span>
      ) : null}

      {showSkeleton ? (
        <span
          className={cn(logoShellClass, "rounded-md bg-muted/80 motion-reduce:animate-none animate-pulse")}
          aria-hidden
        />
      ) : null}

      {showWordmark && variant === "site" ? (
        <span className="site-brand-mark-tagline hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
          Studio booking
        </span>
      ) : null}
    </span>
  );
}
