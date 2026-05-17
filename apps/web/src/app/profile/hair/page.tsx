"use client";

import { AccountSubnav } from "@/components/account-subnav";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  deleteHairProfilePhoto,
  fetchHairProfile,
  updateHairProfile,
  uploadHairProfilePhoto,
} from "@ozilcuts/api";
import {
  HAIR_LENGTH_OPTIONS,
  HAIR_THICKNESS_OPTIONS,
  HAIR_TYPE_OPTIONS,
  SCALP_CONDITION_OPTIONS,
  type HairLength,
  type HairProfile,
  type HairThickness,
  type HairType,
  type ScalpCondition,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScreenTitle,
  Skeleton,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; profile: HairProfile }
  | { kind: "error"; message: string };

const HAIR_TYPE_LABELS: Record<HairType, string> = {
  straight: "Straight",
  wavy: "Wavy",
  curly: "Curly",
  coily: "Coily",
};

const HAIR_THICKNESS_LABELS: Record<HairThickness, string> = {
  fine: "Fine",
  medium: "Medium",
  thick: "Thick",
};

const HAIR_LENGTH_LABELS: Record<HairLength, string> = {
  very_short: "Very short",
  short: "Short",
  medium: "Medium",
  long: "Long",
};

const SCALP_CONDITION_LABELS: Record<ScalpCondition, string> = {
  normal: "Normal",
  dry: "Dry",
  oily: "Oily",
  sensitive: "Sensitive",
};

function fieldErrors(err: ApiValidationError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(err.fieldErrors())) {
    if (messages[0]) out[field] = messages[0];
  }

  return out;
}

export default function HairProfilePage() {
  const { profile: session } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [hairType, setHairType] = useState<"" | HairType>("");
  const [hairThickness, setHairThickness] = useState<"" | HairThickness>("");
  const [hairLength, setHairLength] = useState<"" | HairLength>("");
  const [scalpCondition, setScalpCondition] = useState<"" | ScalpCondition>("");
  const [clipperGuard, setClipperGuard] = useState("");
  const [allergies, setAllergies] = useState("");
  const [stylingNotes, setStylingNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFieldErrors, setSaveFieldErrors] = useState<
    Record<string, string>
  >({});

  const [caption, setCaption] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoDeletingId, setPhotoDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hydrate = useCallback((profile: HairProfile) => {
    setHairType((profile.hair_type ?? "") as "" | HairType);
    setHairThickness((profile.hair_thickness ?? "") as "" | HairThickness);
    setHairLength((profile.hair_length ?? "") as "" | HairLength);
    setScalpCondition(
      (profile.scalp_condition ?? "") as "" | ScalpCondition,
    );
    setClipperGuard(profile.preferred_clipper_guard ?? "");
    setAllergies(profile.allergies ?? "");
    setStylingNotes(profile.styling_notes ?? "");
  }, []);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    setState({ kind: "loading" });
    setSaveMessage(null);
    setSaveError(null);
    setSaveFieldErrors({});
    try {
      const profile = await fetchHairProfile(token);
      hydrate(profile);
      setState({ kind: "ok", profile });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load your hair profile.";
      setState({ kind: "error", message });
    }
  }, [hydrate]);

  useEffect(() => {
    if (session.kind !== "ready") return;
    if (session.user.role.slug !== "customer") return;
    void load();
  }, [session, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;

    setBusy(true);
    setSaveMessage(null);
    setSaveError(null);
    setSaveFieldErrors({});
    try {
      const updated = await updateHairProfile(token, {
        hair_type: hairType === "" ? null : hairType,
        hair_thickness: hairThickness === "" ? null : hairThickness,
        hair_length: hairLength === "" ? null : hairLength,
        scalp_condition: scalpCondition === "" ? null : scalpCondition,
        preferred_clipper_guard:
          clipperGuard.trim() === "" ? null : clipperGuard.trim(),
        allergies: allergies.trim() === "" ? null : allergies.trim(),
        styling_notes: stylingNotes.trim() === "" ? null : stylingNotes.trim(),
      });
      hydrate(updated);
      setState({ kind: "ok", profile: updated });
      setSaveMessage("Hair profile saved.");
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setSaveFieldErrors(fieldErrors(err));
        setSaveError(err.firstMessage() ?? "Validation failed.");
      } else if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError("Could not save your hair profile.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await uploadHairProfilePhoto(
        token,
        file,
        caption.trim() === "" ? undefined : caption.trim(),
      );
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setPhotoError(err.firstMessage() ?? "Could not upload that photo.");
      } else if (err instanceof ApiError) {
        setPhotoError(err.message);
      } else {
        setPhotoError("Could not upload that photo.");
      }
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onDeletePhoto(id: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    if (!window.confirm("Remove this photo?")) return;
    setPhotoDeletingId(id);
    setPhotoError(null);
    try {
      await deleteHairProfilePhoto(token, id);
      await load();
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : "Could not delete photo.",
      );
    } finally {
      setPhotoDeletingId(null);
    }
  }

  const isCustomer =
    session.kind === "ready" && session.user.role.slug === "customer";
  const profile = state.kind === "ok" ? state.profile : null;
  const photoCount = profile?.photos.length ?? 0;

  return (
    <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-3xl page-stack">
          <div className="flex flex-col gap-6">
            <ScreenTitle
              className="gap-3"
              title="Hair profile"
              description="Help your barber pick the right approach. Add photos of recent cuts or styles you love."
            />
            {session.kind === "ready" ? (
              <AccountSubnav isCustomer={isCustomer} />
            ) : null}
          </div>

          {session.kind === "loading" ? (
            <div
              className="space-y-3"
              role="status"
              aria-busy="true"
              aria-label="Loading account"
            >
              <span className="sr-only">Loading…</span>
              <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : null}

          {session.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Sign in to manage your hair profile.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create account</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {session.kind === "ready" && !isCustomer ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer accounts only</CardTitle>
                <CardDescription>
                  Hair profiles belong to customers. Staff see them on each
                  upcoming appointment.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isCustomer && (state.kind === "loading" || state.kind === "idle") ? (
            <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading hair profile">
              <span className="sr-only">Loading hair profile…</span>
              <Card>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-11 w-36 rounded-md" />
                    <Skeleton className="h-11 w-36 rounded-md" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="aspect-square w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          ) : null}

          {isCustomer && state.kind === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle>Couldn&rsquo;t load hair profile</CardTitle>
                <CardDescription>{state.message}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void load()}
                >
                  Retry
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isCustomer && profile ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>About your hair</CardTitle>
                  <CardDescription>
                    Optional, but it helps your barber prep before you arrive.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="hair-type">Hair type</Label>
                        <select
                          id="hair-type"
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          value={hairType}
                          onChange={(ev) =>
                            setHairType(ev.target.value as "" | HairType)
                          }
                          aria-invalid={
                            saveFieldErrors.hair_type ? true : undefined
                          }
                        >
                          <option value="">Not specified</option>
                          {HAIR_TYPE_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {HAIR_TYPE_LABELS[value]}
                            </option>
                          ))}
                        </select>
                        {saveFieldErrors.hair_type ? (
                          <p className="text-sm text-destructive">
                            {saveFieldErrors.hair_type}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="hair-thickness">Thickness</Label>
                        <select
                          id="hair-thickness"
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          value={hairThickness}
                          onChange={(ev) =>
                            setHairThickness(
                              ev.target.value as "" | HairThickness,
                            )
                          }
                        >
                          <option value="">Not specified</option>
                          {HAIR_THICKNESS_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {HAIR_THICKNESS_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="hair-length">Current length</Label>
                        <select
                          id="hair-length"
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          value={hairLength}
                          onChange={(ev) =>
                            setHairLength(ev.target.value as "" | HairLength)
                          }
                        >
                          <option value="">Not specified</option>
                          {HAIR_LENGTH_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {HAIR_LENGTH_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="scalp">Scalp condition</Label>
                        <select
                          id="scalp"
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                          value={scalpCondition}
                          onChange={(ev) =>
                            setScalpCondition(
                              ev.target.value as "" | ScalpCondition,
                            )
                          }
                        >
                          <option value="">Not specified</option>
                          {SCALP_CONDITION_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {SCALP_CONDITION_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="clipper-guard">
                          Preferred clipper guard
                        </Label>
                        <Input
                          id="clipper-guard"
                          value={clipperGuard}
                          onChange={(ev) => setClipperGuard(ev.target.value)}
                          placeholder="e.g. #2, fade, scissor only"
                          aria-invalid={
                            saveFieldErrors.preferred_clipper_guard
                              ? true
                              : undefined
                          }
                        />
                        {saveFieldErrors.preferred_clipper_guard ? (
                          <p className="text-sm text-destructive">
                            {saveFieldErrors.preferred_clipper_guard}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="allergies">Allergies / sensitivities</Label>
                        <Input
                          id="allergies"
                          value={allergies}
                          onChange={(ev) => setAllergies(ev.target.value)}
                          placeholder="e.g. fragrance, tea tree oil"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="styling-notes">Styling notes</Label>
                      <textarea
                        id="styling-notes"
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-32 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-28 sm:text-sm"
                        value={stylingNotes}
                        onChange={(ev) => setStylingNotes(ev.target.value)}
                        placeholder="What you like, what you don't, parting side, etc."
                      />
                    </div>

                    {saveMessage ? (
                      <p
                        className="text-sm text-emerald-700 dark:text-emerald-300"
                        role="status"
                      >
                        {saveMessage}
                      </p>
                    ) : null}
                    {saveError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {saveError}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" pending={busy}>
                        {busy ? "Saving…" : "Save hair profile"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => hydrate(profile)}
                      >
                        Reset changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                  <CardDescription>
                    Up to 8 photos. JPEG, PNG, or WebP, 5 MB max each.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label htmlFor="photo-caption">Caption (optional)</Label>
                      <Input
                        id="photo-caption"
                        value={caption}
                        onChange={(ev) => setCaption(ev.target.value)}
                        placeholder="e.g. Cut from last spring"
                        maxLength={140}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="photo-file">Add a photo</Label>
                      <input
                        id="photo-file"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onUpload}
                        disabled={
                          photoBusy ||
                          photoCount >= 8
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {photoCount >= 8 ? (
                    <p className="text-xs text-muted-foreground">
                      Photo limit reached. Remove one to add another.
                    </p>
                  ) : null}
                  {photoBusy ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      Uploading…
                    </p>
                  ) : null}
                  {photoError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {photoError}
                    </p>
                  ) : null}

                  {photoCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No photos yet — add one to give your barber a visual.
                    </p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {profile.photos.map((photo) => {
                        const isDeleting = photoDeletingId === photo.id;

                        return (
                          <li
                            key={photo.id}
                            className="flex flex-col gap-2 rounded-lg border border-border/60 p-2"
                          >
                            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.caption ?? "Hair photo"}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            {photo.caption ? (
                              <p className="text-sm text-foreground">
                                {photo.caption}
                              </p>
                            ) : null}
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting}
                                onClick={() => void onDeletePhoto(photo.id)}
                              >
                                {isDeleting ? "Removing…" : "Remove"}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/profile" className="underline-offset-4 hover:underline">
              Back to profile
            </Link>
          </p>
        </div>
    </main>
  );
}
