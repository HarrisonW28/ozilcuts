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
      <Image
        src={poster}
        alt=""
        fill
        className={cn(
          "object-cover object-center motion-safe:scale-[1.04]",
          className,
        )}
        sizes="100vw"
        priority
      />
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
