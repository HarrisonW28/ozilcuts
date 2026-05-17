"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { useShopBranding } from "@/lib/shop-branding-context";
import {
  ApiError,
  deleteShopHeroVideo,
  deleteShopLogo,
  updateShopInstagramHandle,
  uploadShopHeroPoster,
  uploadShopHeroVideo,
  uploadShopLogo,
} from "@ozilcuts/api";
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
import { Film, ImageIcon, Store, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AdminShopSettingsPanelProps = {
  hasLogo: boolean;
  hasHeroVideo: boolean;
  hasHeroPoster: boolean;
  instagramHandle: string | null;
  onUpdated: () => void;
};

type BusyKind =
  | "logo"
  | "logo-remove"
  | "video"
  | "poster"
  | "remove"
  | "instagram"
  | null;

const DEFAULT_INSTAGRAM = "ozil.cuts";

export function AdminShopSettingsPanel({
  hasLogo,
  hasHeroVideo,
  hasHeroPoster,
  instagramHandle,
  onUpdated,
}: AdminShopSettingsPanelProps) {
  const { logoUrl } = useShopBranding();
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);

  useEffect(() => {
    setLogoPreviewFailed(false);
  }, [logoUrl]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
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
      setMessage(
        kind === "logo-remove"
          ? "Shop logo removed."
          : kind === "logo"
            ? "Logo uploaded. It appears in the site header and app chrome."
            : kind === "instagram"
              ? "Instagram handle saved."
              : kind === "remove"
                ? "Homepage hero video removed."
                : kind === "video"
                  ? "Hero video uploaded. It appears on the public homepage."
                  : "Hero poster uploaded.",
      );
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
                : "No custom logo — visitors see the default Ozilcuts wordmark."}
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
            Homepage hero video
          </CardTitle>
          <CardDescription>
            Full-width background on the public landing page. Use a short, muted
            loop (MP4 or WebM, max 50&nbsp;MB). A dark overlay keeps text readable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasHeroVideo
              ? "A custom hero video is live on the homepage."
              : "No custom video yet — visitors see the default sample loop."}
            {hasHeroPoster ? " Custom poster image is set." : null}
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
                void run(async () => {
                  await uploadShopHeroVideo(tokenFromStorage(), file);
                }, "video");
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
                void run(async () => {
                  await uploadShopHeroPoster(tokenFromStorage(), file);
                }, "poster");
              }}
            />
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => videoInputRef.current?.click()}
            >
              {busy === "video" ? "Uploading…" : "Upload video"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => posterInputRef.current?.click()}
            >
              <ImageIcon className="mr-1.5 size-4" aria-hidden />
              {busy === "poster" ? "Uploading…" : "Poster image"}
            </Button>
            {hasHeroVideo ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy !== null}
                onClick={() =>
                  void run(async () => {
                    await deleteShopHeroVideo(tokenFromStorage());
                  }, "remove")
                }
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden />
                {busy === "remove" ? "Removing…" : "Remove video"}
              </Button>
            ) : null}
          </div>
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