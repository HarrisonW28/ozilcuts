"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import {
  ApiError,
  ApiValidationError,
  deleteHaircutPhoto,
  fetchAppointmentHaircutPhotos,
  updateHaircutPhoto,
  uploadHaircutPhoto,
} from "@ozilcuts/api";
import {
  HAIRCUT_PHOTO_KINDS,
  type HaircutPhoto,
  type HaircutPhotoKind,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useRef, useState } from "react";

type HaircutPhotosSectionProps = {
  appointmentId: number;
  viewerRole: "customer" | "staff";
};

const KIND_LABELS: Record<HaircutPhotoKind, string> = {
  before: "Before",
  after: "After",
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; photos: HaircutPhoto[] }
  | { kind: "error"; message: string };

export function HaircutPhotosSection({
  appointmentId,
  viewerRole,
}: HaircutPhotosSectionProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [uploadKind, setUploadKind] = useState<HaircutPhotoKind>("after");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });

      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetchAppointmentHaircutPhotos(token, appointmentId);
      setState({ kind: "ok", photos: res.data });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load photos.";
      setState({ kind: "error", message });
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      await uploadHaircutPhoto(
        token,
        appointmentId,
        file,
        uploadKind,
        uploadCaption.trim() === "" ? undefined : uploadCaption.trim(),
      );
      setUploadCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setUploadError(err.firstMessage() ?? "Could not upload that photo.");
      } else if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError("Could not upload that photo.");
      }
    } finally {
      setUploadBusy(false);
    }
  }

  async function onConsent(photo: HaircutPhoto, consent: boolean) {
    const token = getStoredAuthToken();
    if (!token) return;
    setBusyId(photo.id);
    setActionError(null);
    try {
      await updateHaircutPhoto(token, photo.id, { customer_consent: consent });
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not update consent. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onPublish(photo: HaircutPhoto, makePublic: boolean) {
    const token = getStoredAuthToken();
    if (!token) return;
    setBusyId(photo.id);
    setActionError(null);
    try {
      await updateHaircutPhoto(token, photo.id, { is_public: makePublic });
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not update visibility. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(photo: HaircutPhoto) {
    if (!window.confirm("Remove this photo?")) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setBusyId(photo.id);
    setActionError(null);
    try {
      await deleteHaircutPhoto(token, photo.id);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not delete that photo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const photos = state.kind === "ok" ? state.photos : [];
  const hasPhotos = photos.length > 0;

  // Customers should not see an empty section if the barber skipped uploads.
  if (viewerRole === "customer" && state.kind === "ok" && !hasPhotos) {
    return null;
  }

  const isStaff = viewerRole === "staff";
  const canUploadMore = isStaff && photos.length < 12;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Haircut photos</CardTitle>
        <CardDescription>
          {isStaff
            ? "Add before/after photos. The customer must grant consent before you can publish to your portfolio."
            : "Photos your barber added for this appointment. Toggle consent to allow them to be shared on the public portfolio."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.kind === "loading" || state.kind === "idle" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading photos…
          </p>
        ) : null}

        {state.kind === "error" ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isStaff && state.kind === "ok" ? (
          <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
            <div className="flex flex-wrap gap-3 sm:items-end">
              <div
                role="radiogroup"
                aria-label="Photo kind"
                className="flex gap-2"
              >
                {HAIRCUT_PHOTO_KINDS.map((value) => {
                  const checked = uploadKind === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => setUploadKind(value)}
                      className={cn(
                        "min-h-11 rounded-md border px-3 text-sm sm:min-h-9",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/60",
                      )}
                    >
                      {KIND_LABELS[value]}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="haircut-caption">Caption (optional)</Label>
                <Input
                  id="haircut-caption"
                  value={uploadCaption}
                  onChange={(ev) => setUploadCaption(ev.target.value)}
                  placeholder="e.g. Fade with textured top"
                  maxLength={140}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="haircut-file">Add photo</Label>
                <input
                  id="haircut-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onUpload}
                  disabled={uploadBusy || !canUploadMore}
                  className="text-sm"
                />
              </div>
            </div>
            {!canUploadMore ? (
              <p className="text-xs text-muted-foreground">
                Photo limit reached for this appointment.
              </p>
            ) : null}
            {uploadBusy ? (
              <p className="text-sm text-muted-foreground" role="status">
                Uploading…
              </p>
            ) : null}
            {uploadError ? (
              <p className="text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : null}

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        {state.kind === "ok" && !hasPhotos && isStaff ? (
          <p className="text-sm text-muted-foreground">
            No photos yet. Skip if you don&rsquo;t want to add any — the
            customer won&rsquo;t see this section unless you upload.
          </p>
        ) : null}

        {state.kind === "ok" && hasPhotos ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => {
              const isBusy = busyId === photo.id;

              return (
                <li
                  key={photo.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
                      {KIND_LABELS[photo.kind]}
                    </span>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {photo.is_public ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                          Public
                        </span>
                      ) : null}
                      {photo.customer_consent ? (
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                          Consented
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? `${KIND_LABELS[photo.kind]} photo`}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {photo.caption ? (
                    <p className="text-sm text-foreground">{photo.caption}</p>
                  ) : null}

                  {viewerRole === "customer" ? (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border-input"
                        checked={photo.customer_consent}
                        disabled={isBusy}
                        onChange={(ev) =>
                          void onConsent(photo, ev.target.checked)
                        }
                      />
                      <span className="text-muted-foreground">
                        Allow my barber to feature this on their public
                        portfolio
                      </span>
                    </label>
                  ) : null}

                  {isStaff ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={photo.is_public ? "secondary" : "default"}
                        disabled={isBusy || !photo.customer_consent}
                        onClick={() =>
                          void onPublish(photo, !photo.is_public)
                        }
                        title={
                          photo.customer_consent
                            ? undefined
                            : "Awaiting customer consent"
                        }
                      >
                        {photo.is_public ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => void onDelete(photo)}
                      >
                        {isBusy ? "Working…" : "Delete"}
                      </Button>
                      {!photo.customer_consent ? (
                        <span className="text-xs text-muted-foreground">
                          Awaiting customer consent before this can be
                          published.
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
