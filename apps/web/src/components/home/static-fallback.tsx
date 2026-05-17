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
        className={cn(
          variant === "hero" ? "home-cinematic-hero-media" : "home-video-layer relative",
          className,
        )}
        aria-hidden
      >
        <Image
          src={poster}
          alt=""
          fill
          className={cn(
            variant === "hero" ? "object-cover motion-safe:scale-[1.04]" : "home-video-ambient",
          )}
          sizes={variant === "hero" ? "100vw" : "(max-width: 640px) 50vw, 16rem"}
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
