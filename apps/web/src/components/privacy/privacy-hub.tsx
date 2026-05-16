"use client";

import { getStoredAuthToken, clearStoredAuthToken } from "@/lib/auth-token";
import {
  browserNotificationsSupported,
  currentBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from "@/lib/browser-notifications";
import {
  ApiError,
  ApiValidationError,
  deleteCustomerAccount,
  exportCustomerData,
  fetchCustomerPrivacy,
  updateCustomerPrivacy,
} from "@ozilcuts/api";
import type { CustomerPrivacySnapshot } from "@ozilcuts/types";
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
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import { Bell, Download, MapPin, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerPrivacySnapshot }
  | { kind: "error"; message: string };

function formatWhen(iso: string | null): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PrivacyHub() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [arrivalLocationOptIn, setArrivalLocationOptIn] = useState(false);
  const [retentionPaused, setRetentionPaused] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [browserPerm, setBrowserPerm] = useState(
    currentBrowserNotificationPermission(),
  );

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchCustomerPrivacy(token);
      setMarketingOptIn(data.consents.marketing_opt_in);
      setArrivalLocationOptIn(data.consents.arrival_location_opt_in);
      setRetentionPaused(data.consents.retention_paused);
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      setState({
        kind: "error",
        message:
          e instanceof ApiError ? e.message : "Could not load privacy settings.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    setBrowserPerm(currentBrowserNotificationPermission());
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    setSaveBusy(true);
    setSaveMessage(null);
    try {
      const data = await updateCustomerPrivacy(token, {
        marketing_opt_in: marketingOptIn,
        arrival_location_opt_in: arrivalLocationOptIn,
        retention_paused: retentionPaused,
      });
      setState({ kind: "ok", data });
      setSaveMessage("Privacy preferences saved.");
    } catch (e: unknown) {
      setSaveMessage(
        e instanceof ApiError ? e.message : "Could not save preferences.",
      );
    } finally {
      setSaveBusy(false);
    }
  }

  async function onExport() {
    const token = getStoredAuthToken();
    if (!token) return;
    setExportBusy(true);
    try {
      const blob = await exportCustomerData(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ozilcuts-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setSaveMessage(
        e instanceof ApiError ? e.message : "Export failed. Try again shortly.",
      );
    } finally {
      setExportBusy(false);
    }
  }

  async function onDeleteAccount() {
    const token = getStoredAuthToken();
    if (!token) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteCustomerAccount(token, { confirmation: "DELETE" });
      clearStoredAuthToken();
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setDeleteError(
        e instanceof ApiValidationError
          ? (e.firstMessage() ?? "Confirmation required.")
          : e instanceof ApiError
            ? e.message
            : "Could not delete account.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function onRequestBrowserNotifications() {
    const next = await requestBrowserNotificationPermission();
    setBrowserPerm(next);
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { data } = state;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Shield className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <CardTitle className="text-lg">Your privacy, your control</CardTitle>
              <CardDescription className="leading-relaxed">
                Manage consent, location, notifications, and your data rights in
                one place. We only use what you opt into.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Terms accepted: {formatWhen(data.consents.terms_accepted_at)} · Privacy
            policy: {formatWhen(data.consents.privacy_policy_accepted_at)}
          </p>
        </CardContent>
      </Card>

      <form onSubmit={onSave}>
        <Card id="location">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" aria-hidden />
              Location during visits
            </CardTitle>
            <CardDescription>
              Optional coarse location pings only while check-in is open — never
              continuous tracking. You can allow or block browser location separately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                checked={arrivalLocationOptIn}
                onChange={(e) => setArrivalLocationOptIn(e.target.checked)}
              />
              <span className="text-sm leading-relaxed">
                <span className="font-medium text-foreground">
                  Arrival location sharing
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Enables nearby alerts and gentle auto check-in inside the studio
                  zone during your visit window.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Communication</CardTitle>
            <CardDescription>
              Marketing and retention are separate from appointment confirmations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
              />
              <span className="text-sm leading-relaxed">
                Studio updates and offers by email
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                checked={!retentionPaused}
                onChange={(e) => setRetentionPaused(!e.target.checked)}
              />
              <span className="text-sm leading-relaxed">
                Gentle rebook reminders when you are due for a cut
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="mt-4" id="notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" aria-hidden />
              Notifications
            </CardTitle>
            <CardDescription>
              {data.notifications.enabled_count} of {data.notifications.total_count}{" "}
              channels enabled in your account preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href="/profile/notifications">
                Manage email &amp; in-app alerts
              </Link>
            </Button>

            {browserNotificationsSupported() ? (
              <div className="rounded-lg border border-border/50 bg-muted/15 p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Browser notifications
                </p>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  Status:{" "}
                  <span className="font-medium text-foreground">{browserPerm}</span>
                  . These are optional and controlled by your device — use them if
                  you want desktop alerts when the app is in the background.
                </p>
                {browserPerm !== "granted" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-10"
                    onClick={() => void onRequestBrowserNotifications()}
                  >
                    Request browser permission
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border/40 sm:flex-row sm:items-center">
            <Button type="submit" disabled={saveBusy} className="min-h-11">
              {saveBusy ? "Saving…" : "Save privacy preferences"}
            </Button>
            {saveMessage ? (
              <p className="text-sm text-muted-foreground" role="status">
                {saveMessage}
              </p>
            ) : null}
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="size-4 text-primary" aria-hidden />
            Your data
          </CardTitle>
          <CardDescription>
            Download a portable copy of your account data (JSON). Deletion removes
            personal details and cancels upcoming visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={exportBusy}
            onClick={() => void onExport()}
          >
            {exportBusy ? "Preparing export…" : "Download my data"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="size-4" aria-hidden />
            Delete account
          </CardTitle>
          <CardDescription>
            This permanently removes your profile, hair photos, and signs you out
            everywhere. Past visits stay anonymized for the shop record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              className="max-w-xs font-mono"
            />
          </div>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={deleteBusy || deleteConfirm !== "DELETE"}
            onClick={() => void onDeleteAccount()}
          >
            {deleteBusy ? "Deleting…" : "Delete my account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
