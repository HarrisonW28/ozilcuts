"use client";

import { Button, Skeleton, cn } from "@ozilcuts/ui";
import { Check, ChevronDown, Copy, QrCode, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type CheckInQrFallbackProps = {
  mode: "customer" | "staff";
  checkInAbsoluteUrl: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  qrReady: boolean;
  defaultOpen?: boolean;
  /** Open QR panel by default on narrow viewports when expected. */
  preferOpenOnMobile?: boolean;
};

export function CheckInQrFallback({
  mode,
  checkInAbsoluteUrl,
  canvasRef,
  qrReady,
  defaultOpen = false,
  preferOpenOnMobile = false,
}: CheckInQrFallbackProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!preferOpenOnMobile || defaultOpen) return;
    const el = detailsRef.current;
    if (!el) return;
    if (window.matchMedia("(max-width: 639px)").matches) {
      el.open = true;
    }
  }, [defaultOpen, preferOpenOnMobile]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(checkInAbsoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [checkInAbsoluteUrl]);

  const shareLink = useCallback(async () => {
    setShareError(null);
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Check in to your visit",
        url: checkInAbsoluteUrl,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setShareError("Could not open share sheet — try copy link instead.");
    }
  }, [checkInAbsoluteUrl, copyLink]);

  return (
    <details
      ref={detailsRef}
      className="check-in-qr-panel group open:border-border/70 open:bg-muted/15 dark:open:bg-muted/10"
      open={defaultOpen}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-foreground outline-none ring-offset-background marker:content-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden touch-manipulation">
        <span className="flex items-center gap-2">
          <QrCode className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          QR check-in
          <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Fallback
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/40 px-4 pb-5 pt-2">
        <p className="mb-4 text-caption leading-relaxed text-muted-foreground">
          {mode === "staff"
            ? "Desk QR for guests without the app open — scan opens this visit instantly."
            : "No tap? Point your camera at the code or copy the link — same check-in page."}
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="relative h-[216px] w-[216px] max-w-full shrink-0 rounded-xl bg-background p-2 shadow-sm ring-1 ring-border/40">
            {!qrReady ? (
              <Skeleton className="absolute inset-2 rounded-lg" aria-hidden />
            ) : null}
            <canvas
              ref={canvasRef}
              className={cn(
                "h-full w-full rounded-lg",
                !qrReady
                  ? "opacity-0"
                  : "opacity-100 motion-safe:transition-opacity motion-safe:duration-300",
              )}
              role="img"
              aria-label="QR code for check-in page"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <p className="text-caption leading-relaxed text-muted-foreground">
              Works on any phone with the same account you used to book. Keep
              this page open for live queue updates.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 w-full touch-manipulation sm:w-auto"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="mr-2 size-4" aria-hidden />
                ) : (
                  <Copy className="mr-2 size-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 w-full touch-manipulation sm:w-auto"
                onClick={() => void shareLink()}
              >
                <Share2 className="mr-2 size-4" aria-hidden />
                Share
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="min-h-11 w-full touch-manipulation sm:w-auto"
              >
                <a href={checkInAbsoluteUrl} rel="noopener noreferrer">
                  Open link
                </a>
              </Button>
            </div>
            {shareError ? (
              <p className="text-caption text-destructive" role="alert">
                {shareError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </details>
  );
}
