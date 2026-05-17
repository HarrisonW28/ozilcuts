"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { useShopBranding } from "@/lib/shop-branding-context";
import {
  ApiError,
  deleteShopHeroPoster,
  deleteShopHeroVideo,
  deleteShopLogo,
  updateShopInstagramHandle,
  uploadShopHeroPoster,
  uploadShopHeroVideo,
  uploadShopLogo,
} from "@ozilcuts/api";
import type { HeroMediaVariant } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ozilcuts/ui";
import { InstagramIcon } from "@/components/social/instagram-icon";
import { Film, ImageIcon, Monitor, Smartphone, Store, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type AdminShopSettingsPanelProps = {
  hasLogo: boolean;
  hasHeroVideoDesktop: boolean;
  hasHeroVideoMobile: boolean;
  hasHeroPosterDesktop: boolean;
  hasHeroPosterMobile: boolean;
  instagramHandle: string | null;
  onUpdated: () => void;
};

type BusyKind =
  | "logo"
  | "logo-remove"
  | `video-${HeroMediaVariant}`
  | `poster-${HeroMediaVariant}`
  | `video-remove-${HeroMediaVariant}`
  | `poster-remove-${HeroMediaVariant}`
  | "instagram"
  | null;

const DEFAULT_INSTAGRAM = "ozil.cuts";

type HeroMediaSlotProps = {
  variant: HeroMediaVariant;
  label: string;
  icon: ReactNode;
  hasVideo: boolean;
  hasPoster: boolean;
  busy: BusyKind;
  onRun: (action: () => Promise<void>, kind: BusyKind) => void;
};

function HeroMediaSlot({
  variant,
  label,
  icon,
  hasVideo,
  hasPoster,
  busy,
  onRun,
}: HeroMediaSlotProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const videoBusy = busy === `video-${variant}`;
  const posterBusy = busy === `poster-${variant}`;
  const removeVideoBusy = busy === `video-remove-${variant}`;
  const removePosterBusy = busy === `poster-remove-${variant}`;
  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm text-muted-foreground">
        {hasVideo
          ? "Video is live for this breakpoint."
          : "No video — the homepage shows a gradient until you upload."}
        {hasPoster ? " Poster image is set." : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void onRun(async () => {
              await uploadShopHeroVideo(tokenFromStorage(), file, variant);
            }, `video-${variant}`);
          }}
        />
        <input
          ref={posterInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void onRun(async () => {
              await uploadShopHeroPoster(tokenFromStorage(), file, variant);
            }, `poster-${variant}`);
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy !== null}
          onClick={() => videoInputRef.current?.click()}
        >
          {videoBusy ? "Uploading…" : "Upload video"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => posterInputRef.current?.click()}
        >
          <ImageIcon className="mr-1.5 size-4" aria-hidden />
          {posterBusy ? "Uploading…" : "Poster"}
        </Button>
        {hasVideo ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy !== null}
            onClick={() =>
              void onRun(async () => {
                await deleteShopHeroVideo(tokenFromStorage(), variant);
              }, `video-remove-${variant}`)
            }
          >
            <Trash2 className="mr-1.5 size-4" aria-hidden />
            {removeVideoBusy ? "Removing…" : "Remove video"}
          </Button>
        ) : null}
        {hasPoster ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy !== null}
            onClick={() =>
              void onRun(async () => {
                await deleteShopHeroPoster(tokenFromStorage(), variant);
              }, `poster-remove-${variant}`)
            }
          >
            <Trash2 className="mr-1.5 size-4" aria-hidden />
            {removePosterBusy ? "Removing…" : "Remove poster"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminShopSettingsPanel({
  hasLogo,
  hasHeroVideoDesktop,
  hasHeroVideoMobile,
  hasHeroPosterDesktop,
  hasHeroPosterMobile,
  instagramHandle,
  onUpdated,
}: AdminShopSettingsPanelProps) {
  const { logoUrl } = useShopBranding();
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);

  useEffect(() => {
    setLogoPreviewFailed(false);
  }, [logoUrl]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instagramDraft, setInstagramDraft] = useState(
    () => instagramHandle ?? "",
  );

  useEffect(() => {
    setInstagramDraft(instagramHandle ?? "");
  }, [instagramHandle]);

  const run = async (action: () => Promise<void>, kind: BusyKind) => {
    const token = getStoredAuthToken();
    if (!token) {
      setError("Sign in required.");
      return;
    }
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (kind === "logo-remove") {
        setMessage("Shop logo removed.");
      } else if (kind === "logo") {
        setMessage("Logo uploaded. It appears in the site header and app chrome.");
      } else if (kind === "instagram") {
        setMessage("Instagram handle saved.");
      } else if (typeof kind === "string" && kind.startsWith("video-remove-")) {
        setMessage("Hero video removed.");
      } else if (typeof kind === "string" && kind.startsWith("poster-remove-")) {
        setMessage("Hero poster removed.");
      } else if (typeof kind === "string" && kind.startsWith("video-")) {
        setMessage("Hero video uploaded. It appears on the public homepage.");
      } else if (typeof kind === "string" && kind.startsWith("poster-")) {
        setMessage("Hero poster uploaded.");
      }
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="size-5 text-primary" aria-hidden />
            Shop logo
          </CardTitle>
          <CardDescription>
            Shown in the site header instead of the default wordmark. Square or
            wide PNG, JPEG, or WebP (max 2&nbsp;MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-1">
              {logoUrl && !logoPreviewFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logo URL
                <img
                  src={logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  onError={() => setLogoPreviewFailed(true)}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {hasLogo && logoPreviewFailed ? "Preview unavailable" : "No logo"}
                </span>
              )}
            </div>
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {hasLogo
                ? "A custom logo is live across the public site."
                : "No custom logo — visitors see the default studio mark."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void run(async () => {
                  await uploadShopLogo(tokenFromStorage(), file);
                }, "logo");
              }}
            />
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => logoInputRef.current?.click()}
            >
              {busy === "logo" ? "Uploading…" : "Upload logo"}
            </Button>
            {hasLogo ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy !== null}
                onClick={() =>
                  void run(async () => {
                    await deleteShopLogo(tokenFromStorage());
                  }, "logo-remove")
                }
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden />
                {busy === "logo-remove" ? "Removing…" : "Remove logo"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="h-full lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Film className="size-5 text-primary" aria-hidden />
            Homepage hero media
          </CardTitle>
          <CardDescription>
            Full-width background on the landing page. Upload separate loops for
            desktop (md and up) and mobile. Short, muted MP4 or WebM (max
            50&nbsp;MB each). If only desktop is set, mobile visitors use that
            clip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HeroMediaSlot
            variant="desktop"
            label="Desktop"
            icon={<Monitor className="size-4 text-primary" aria-hidden />}
            hasVideo={hasHeroVideoDesktop}
            hasPoster={hasHeroPosterDesktop}
            busy={busy}
            onRun={run}
          />
          <HeroMediaSlot
            variant="mobile"
            label="Mobile"
            icon={<Smartphone className="size-4 text-primary" aria-hidden />}
            hasVideo={hasHeroVideoMobile}
            hasPoster={hasHeroPosterMobile}
            busy={busy}
            onRun={run}
          />
        </CardContent>
      </Card>

      <Card className="h-full lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <InstagramIcon className="size-5 text-primary" />
            Instagram
          </CardTitle>
          <CardDescription>
            Handle shown in the homepage social section and footer links. Leave
            blank to use the default{" "}
            <span className="font-medium text-foreground">@{DEFAULT_INSTAGRAM}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="shop-instagram-handle">Handle</Label>
            <div className="flex gap-2">
              <span className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="shop-instagram-handle"
                value={instagramDraft}
                onChange={(e) => setInstagramDraft(e.target.value.replace(/^@/, ""))}
                placeholder={DEFAULT_INSTAGRAM}
                autoComplete="off"
                spellCheck={false}
                disabled={busy !== null}
                className="flex-1"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {instagramHandle
              ? `Live on site as @${instagramHandle}.`
              : `Using default @${DEFAULT_INSTAGRAM} on the public site.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run(async () => {
                  const trimmed = instagramDraft.trim();
                  await updateShopInstagramHandle(
                    tokenFromStorage(),
                    trimmed.length > 0 ? trimmed : null,
                  );
                  setInstagramDraft(trimmed);
                }, "instagram")
              }
            >
              {busy === "instagram" ? "Saving…" : "Save handle"}
            </Button>
            {instagramHandle ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  setInstagramDraft("");
                  void run(async () => {
                    await updateShopInstagramHandle(tokenFromStorage(), null);
                  }, "instagram");
                }}
              >
                Use default
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-300 lg:col-span-2"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive lg:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function tokenFromStorage(): string {
  const token = getStoredAuthToken();
  if (!token) throw new Error("Sign in required.");
  return token;
}
