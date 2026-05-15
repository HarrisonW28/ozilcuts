"use client";

import {
  buildHaircutSharePayload,
  shareHaircut,
  type HaircutShareInput,
} from "@/lib/haircut-share";
import { getSocialConfig } from "@/lib/social-config";
import { Button, cn } from "@ozilcuts/ui";
import { Check, Share2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

type HaircutShareCardProps = HaircutShareInput & {
  className?: string;
};

/**
 * Shareable visit card — Web Share API with clipboard fallback.
 */
export function HaircutShareCard({
  className,
  barberName,
  serviceName,
  visitDateIso,
  barberUserId,
  appointmentId,
  photoUrl,
}: HaircutShareCardProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "failed">(
    "idle",
  );
  const social = useMemo(() => getSocialConfig(), []);

  const payload = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return buildHaircutSharePayload(
      {
        barberName,
        serviceName,
        visitDateIso,
        barberUserId,
        appointmentId,
        photoUrl,
      },
      origin,
    );
  }, [
    barberName,
    serviceName,
    visitDateIso,
    barberUserId,
    appointmentId,
    photoUrl,
  ]);

  const onShare = useCallback(async () => {
    setStatus("idle");
    const result = await shareHaircut(payload);
    setStatus(result === "failed" ? "failed" : result);
    if (result !== "failed") {
      window.setTimeout(() => setStatus("idle"), 2800);
    }
  }, [payload]);

  const showImage =
    photoUrl &&
    (photoUrl.startsWith("/") || photoUrl.startsWith("http"));

  return (
    <article
      className={cn("social-share-card", className)}
      aria-labelledby="haircut-share-heading"
    >
      <div className="social-share-card-preview">
        {showImage ? (
          <Image
            src={photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 28rem"
            aria-hidden
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widecaps text-muted-foreground">
            Fresh cut
          </p>
          <h3
            id="haircut-share-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-foreground"
          >
            {barberName}
          </h3>
          {serviceName ? (
            <p className="mt-1 text-sm text-muted-foreground">{serviceName}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Share your visit — friends book from your barber&apos;s portfolio.{" "}
          {social.instagramHandle ? (
            <>
              Tag{" "}
              <span className="font-medium text-foreground">
                @{social.instagramHandle}
              </span>{" "}
              if you post.
            </>
          ) : null}
        </p>
        <Button
          type="button"
          className="min-h-11 w-full touch-manipulation"
          onClick={() => void onShare()}
        >
          {status === "copied" ? (
            <Check className="mr-2 size-4" aria-hidden />
          ) : (
            <Share2 className="mr-2 size-4" aria-hidden />
          )}
          {status === "shared"
            ? "Shared"
            : status === "copied"
              ? "Link copied"
              : status === "failed"
                ? "Couldn’t share — try again"
                : "Share your cut"}
        </Button>
        <p className="text-center text-xs text-muted-foreground" role="status">
          {status === "idle"
            ? "Uses your device share sheet when available."
            : null}
        </p>
      </div>
    </article>
  );
}
