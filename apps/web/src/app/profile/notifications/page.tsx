"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@ozilcuts/api";
import type {
  NotificationChannel,
  NotificationEvent,
  NotificationPreferenceRow,
  NotificationPreferencesResponse,
} from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: NotificationPreferencesResponse }
  | { kind: "error"; message: string };

function key(eventKey: NotificationEvent, channel: NotificationChannel): string {
  return `${eventKey}|${channel}`;
}

export default function NotificationPreferencesPage() {
  const { profile, signOut } = useSessionProfile();
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const isReady = profile.kind === "ready";

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchNotificationPreferences(token);
      const seed: Record<string, boolean> = {};
      for (const row of data.preferences) {
        seed[key(row.event_key, row.channel)] = row.enabled;
      }
      setDraft(seed);
      setState({ kind: "ok", data });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load preferences.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  const dirty = useMemo(() => {
    if (state.kind !== "ok") return false;
    for (const row of state.data.preferences) {
      const k = key(row.event_key, row.channel);
      if ((draft[k] ?? row.enabled) !== row.enabled) return true;
    }
    return false;
  }, [draft, state]);

  function toggle(eventKey: NotificationEvent, channel: NotificationChannel) {
    const k = key(eventKey, channel);
    setDraft((cur) => ({ ...cur, [k]: !(cur[k] ?? true) }));
  }

  async function onSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (state.kind !== "ok") return;
    const token = getStoredAuthToken();
    if (!token) return;

    const payload: NotificationPreferenceRow[] = state.data.preferences.map(
      (row) => ({
        event_key: row.event_key,
        channel: row.channel,
        enabled: draft[key(row.event_key, row.channel)] ?? row.enabled,
      }),
    );

    setSaveBusy(true);
    setSaveStatus({ kind: "saving" });
    try {
      await updateNotificationPreferences(token, payload);
      await load();
      setSaveStatus({ kind: "saved" });
    } catch (err: unknown) {
      const message =
        err instanceof ApiValidationError
          ? (err.firstMessage() ?? "Validation failed.")
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not save preferences.";
      setSaveStatus({ kind: "error", message });
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Notification preferences"
            description="Choose which updates we send by email and which appear in your in-app inbox."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Sign in to manage notification preferences.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady && state.kind === "loading" ? (
            <p
              className="text-sm text-muted-foreground"
              role="status"
            >
              Loading preferences…
            </p>
          ) : null}

          {isReady && state.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}

          {isReady && state.kind === "ok" ? (
            <Card>
              <CardHeader>
                <CardTitle>Channels by event</CardTitle>
                <CardDescription>
                  Email goes to the address on your account. In-app shows in
                  the bell at the top of the page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={onSave}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Event</th>
                          {state.data.channels.map((c) => (
                            <th
                              key={c.key}
                              className="py-2 pr-3 text-center font-medium"
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.events.map((evt) => (
                          <tr
                            key={evt.key}
                            className="border-b border-border/30 last:border-0"
                          >
                            <td className="py-3 pr-3 align-top">
                              <p className="font-medium text-foreground">
                                {evt.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {evt.description}
                              </p>
                            </td>
                            {state.data.channels.map((c) => {
                              const k = key(evt.key, c.key);
                              const enabled = draft[k] ?? true;
                              const inputId = `pref-${k}`;
                              return (
                                <td
                                  key={c.key}
                                  className="py-3 pr-3 text-center align-middle"
                                >
                                  <label
                                    htmlFor={inputId}
                                    className="inline-flex items-center gap-2"
                                  >
                                    <input
                                      id={inputId}
                                      type="checkbox"
                                      className="size-5 rounded border-input"
                                      checked={enabled}
                                      onChange={() => toggle(evt.key, c.key)}
                                      aria-label={`${evt.label} via ${c.label}`}
                                    />
                                    <span className="sr-only">
                                      {`${evt.label} via ${c.label}`}
                                    </span>
                                  </label>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {saveStatus.kind === "saved" ? (
                    <p
                      className="text-sm text-muted-foreground"
                      role="status"
                    >
                      Preferences saved.
                    </p>
                  ) : null}
                  {saveStatus.kind === "error" ? (
                    <p className="text-sm text-destructive" role="alert">
                      {saveStatus.message}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saveBusy || !dirty}>
                      {saveBusy ? "Saving…" : "Save preferences"}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/notifications">Back to inbox</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/profile"
              className="underline-offset-4 hover:underline"
            >
              Back to profile
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
