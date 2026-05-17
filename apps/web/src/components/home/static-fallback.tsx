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

  if (poster && variant === "hero") {
    return (
      <div
        className={cn("absolute inset-0 size-full min-h-full min-w-full", className)}
        aria-hidden
      >
        <Image
          src={poster}
          alt=""
          fill
          className="object-cover object-center motion-safe:scale-[1.02]"
          sizes="100vw"
          priority
        />
      </div>
    );
  }

  if (poster) {
    return (
      <div className={cn("home-video-layer relative", className)} aria-hidden>
        <Image
          src={poster}
          alt=""
          fill
          className="home-video-ambient object-cover"
          sizes="(max-width: 640px) 50vw, 16rem"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === "hero" ? "home-video-fallback-hero" : "home-video-layer",
        variant !== "hero" && fallbackClass,
        className,
      )}
      aria-hidden
    />
  );
}
