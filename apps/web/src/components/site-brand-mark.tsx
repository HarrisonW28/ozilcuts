"use client";

import { useShopBranding } from "@/lib/shop-branding-context";
import { cn } from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { useEffect, useState } from "react";

type SiteBrandMarkProps = {
  /** Site header shows tagline under wordmark when no custom logo. */
  variant?: "site" | "shell";
  className?: string;
};

const logoShellClass =
  "relative flex h-9 min-h-9 min-w-9 max-h-10 max-w-[10rem] shrink-0 items-center justify-center sm:h-10 sm:min-h-10 sm:min-w-10 sm:max-w-[11rem]";

/**
 * Header lockup: custom shop logo (square or wide) or wordmark — never a broken image.
 */
export function SiteBrandMark({
  variant = "site",
  className,
}: SiteBrandMarkProps) {
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
          ? "flex-col items-start gap-0"
          : "items-center",
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
            fetchPriority="high"
            className={cn(
              "relative z-[1] max-h-full max-w-full object-contain object-left",
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

      {showWordmark ? (
        variant === "site" ? (
          <>
            <span className="block text-sm font-semibold tracking-[-0.02em] text-foreground">
              {OZILCUTS_APP_NAME}
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Studio booking
            </span>
          </>
        ) : (
          <span className="block text-sm font-semibold tracking-[-0.02em] text-foreground">
            {OZILCUTS_APP_NAME}
          </span>
        )
      ) : null}
    </span>
  );
}
