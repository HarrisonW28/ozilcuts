"use client";

import type { LightboxPayload } from "@/lib/content-photography";
import { Button } from "@ozilcuts/ui";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

type PhotoLightboxProps = {
  payload: LightboxPayload | null;
  onClose: () => void;
};

export function PhotoLightbox({ payload, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (payload) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [payload]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dialogRef.current?.close();
        }
      }}
      className="content-lightbox-dialog"
    >
      <div className="flex min-h-0 max-h-[min(94dvh,56rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/45 px-2 py-2 sm:px-3">
          <p className="min-w-0 truncate px-2 text-xs text-muted-foreground sm:text-sm">
            {payload?.caption ?? "\u00a0"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 min-h-11 min-w-11 touch-manipulation"
            aria-label="Close viewer"
            onClick={() => dialogRef.current?.close()}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1 bg-muted/20 p-2 sm:p-4">
          <div className="relative mx-auto h-[min(78dvh,48rem)] w-full max-w-full">
            {payload ? (
              <Image
                src={payload.url}
                alt={payload.alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 52rem"
                priority
              />
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
