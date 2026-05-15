"use client";

import { cn } from "@ozilcuts/ui";
import Image from "next/image";

type HomeVideoStaticFallbackProps = {
  variant: "hero" | "ambient";
  poster?: string;
  className?: string;
};

export function HomeVideoStaticFallback({
  variant,
  poster,
  className,
}: HomeVideoStaticFallbackProps) {
  const fallbackClass =
    variant === "hero"
      ? "home-video-fallback-hero"
      : "home-video-fallback-ambient";

  if (poster) {
    return (
      <div
        className={cn("home-video-layer relative", className)}
        aria-hidden
      >
        <Image
          src={poster}
          alt=""
          fill
          className={cn(
            variant === "hero" ? "home-video-hero" : "home-video-ambient",
            "object-cover",
          )}
          sizes={
            variant === "hero"
              ? "(max-width: 768px) 100vw, 72rem"
              : "(max-width: 640px) 50vw, 16rem"
          }
          priority={variant === "hero"}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("home-video-layer", fallbackClass, className)}
      aria-hidden
    />
  );
}
