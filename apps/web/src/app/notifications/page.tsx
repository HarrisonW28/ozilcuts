"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@ozilcuts/api";
import type {
  NotificationData,
  NotificationEvent,
  NotificationRecord,
  Paginated,
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
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; page: Paginated<NotificationRecord> }
  | { kind: "error"; message: string };

const EVENT_LABELS: Record<NotificationEvent, string> = {
  "appointment.confirmed": "Appointment confirmed",
  "appointment.cancelled": "Appointment cancelled",
  "appointment.rescheduled": "Appointment rescheduled",
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) {
    const m = Math.floor(diffSeconds / 60);
    return `${m}m ago`;
  }
  if (diffSeconds < 86400) {
    const h = Math.floor(diffSeconds / 3600);
    return `${h}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function describe(record: NotificationRecord): string {
  const data: NotificationData = record.data;
  const service =
    typeof data.service_name === "string" && data.service_name.length > 0
      ? data.service_name
      : "your appointment";
  const barber =
    typeof data.barber_name === "string" && data.barber_name.length > 0
      ? data.barber_name
      : null;
  const when =
    typeof data.starts_at === "string" ? formatDateTime(data.starts_at) : "";

  if (record.type === "appointment.confirmed") {
    return barber
      ? `${service} with ${barber}${when ? ` · ${when}` : ""}`
      : `${service}${when ? ` · ${when}` : ""}`;
  }
  if (record.type === "appointment.cancelled") {
    return barber
      ? `${service} with ${barber} was cancelled.`
      : `${service} was cancelled.`;
  }
  if (record.type === "appointment.rescheduled") {
    const previous =
      typeof data.previous_starts_at === "string"
        ? formatDateTime(data.previous_starts_at)
        : null;
    const base = barber
      ? `${service} with ${barber} moved to ${when}`
      : `${service} moved to ${when}`;
    return previous ? `${base} (was ${previous}).` : `${base}.`;
  }
  return EVENT_LABELS[record.type] ?? record.type;
}

function appointmentHref(record: NotificationRecord): string | null {
  const id = record.data?.appointment_id;
  if (typeof id === "number" && id > 0) {
    return `/appointments/${id}/confirmation`;
  }
  return null;
}

export default function NotificationsPage() {
  const { profile, signOut } = useSessionProfile();
  const [page, setPage] = useState<number>(1);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [allBusy, setAllBusy] = useState<boolean>(false);

  const isReady = profile.kind === "ready";

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchNotifications(token, {
        unread: unreadOnly,
        page,
      });
      setState({ kind: "ok", page: data });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load notifications.";
      setState({ kind: "error", message });
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function onMarkRead(record: NotificationRecord) {
    if (record.read_at !== null) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setBusyId(record.id);
    try {
      await markNotificationRead(token, record.id);
      await load();
    } catch {
      // Surface inline; non-fatal.
    } finally {
      setBusyId(null);
    }
  }

  async function onMarkAllRead() {
    const token = getStoredAuthToken();
    if (!token) return;
    setAllBusy(true);
    try {
      await markAllNotificationsRead(token);
      await load();
    } catch {
      // Soft-fail; user can retry.
    } finally {
      setAllBusy(false);
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
            title="Notifications"
            description="Updates about your appointments and account."
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
                  Sign in to see your notifications.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isReady ? (
            <>
              <div
                className="flex flex-wrap items-center justify-between gap-3"
                role="region"
                aria-label="Notification controls"
              >
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={unreadOnly ? "outline" : "default"}
                    onClick={() => {
                      setUnreadOnly(false);
                      setPage(1);
                    }}
                    aria-pressed={!unreadOnly}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={unreadOnly ? "default" : "outline"}
                    onClick={() => {
                      setUnreadOnly(true);
                      setPage(1);
                    }}
                    aria-pressed={unreadOnly}
                  >
                    Unread
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onMarkAllRead()}
                    disabled={allBusy}
                  >
                    {allBusy ? "Marking…" : "Mark all read"}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/profile/notifications">Preferences</Link>
                  </Button>
                </div>
              </div>

              {state.kind === "loading" ? (
                <p
                  className="text-sm text-muted-foreground"
                  role="status"
                >
                  Loading notifications…
                </p>
              ) : null}
              {state.kind === "error" ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}

              {state.kind === "ok" && state.page.data.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>You&rsquo;re all caught up</CardTitle>
                    <CardDescription>
                      {unreadOnly
                        ? "No unread notifications."
                        : "Notifications about your appointments will appear here."}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              {state.kind === "ok" && state.page.data.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {state.page.data.map((row) => {
                    const href = appointmentHref(row);
                    const unread = row.read_at === null;
                    return (
                      <li key={row.id}>
                        <Card
                          className={
                            unread
                              ? "border-primary/40 bg-primary/5"
                              : undefined
                          }
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <span>{EVENT_LABELS[row.type] ?? row.type}</span>
                              {unread ? (
                                <span
                                  className="inline-block h-2 w-2 rounded-full bg-primary"
                                  aria-label="unread"
                                />
                              ) : null}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {formatRelative(row.created_at)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{describe(row)}</p>
                          </CardContent>
                          <CardFooter className="flex flex-wrap gap-2">
                            {href ? (
                              <Button asChild size="sm" variant="secondary">
                                <Link href={href}>View appointment</Link>
                              </Button>
                            ) : null}
                            {unread ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() => void onMarkRead(row)}
                              >
                                {busyId === row.id ? "Marking…" : "Mark read"}
                              </Button>
                            ) : null}
                          </CardFooter>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {state.kind === "ok" && state.page.meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {state.page.meta.current_page} of{" "}
                    {state.page.meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={state.page.meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        state.page.meta.current_page >=
                        state.page.meta.last_page
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
