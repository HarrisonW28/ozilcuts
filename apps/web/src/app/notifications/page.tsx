"use client";

import { NotificationInboxList } from "@/components/notifications";
import { SiteHeader } from "@/components/site-header";
import { useShellPageChrome } from "@/lib/use-shell-page-chrome";
import { NotificationListSkeleton } from "@/components/load-empty";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  isRetentionBookNotification,
  notificationPrimaryHref,
  primaryActionLabel,
  rebookHref,
  sortNotificationsForDisplay,
} from "@/lib/notification-presenter";
import { useInbox } from "@/lib/use-inbox";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchNotifications,
  snoozeRebookNudge,
} from "@ozilcuts/api";
import type { NotificationRecord, Paginated } from "@ozilcuts/types";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  EmptyState,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; page: Paginated<NotificationRecord> }
  | { kind: "error"; message: string };

export default function NotificationsPage() {
  const { profile, signOut } = useSessionProfile();
  const inbox = useInbox();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [page, setPage] = useState<number>(1);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [operationalOnly, setOperationalOnly] = useState<boolean>(
    initialFilter === "operational",
  );
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [allBusy, setAllBusy] = useState<boolean>(false);
  const [snoozeBusyId, setSnoozeBusyId] = useState<number | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<number>>(new Set());

  const isReady = profile.kind === "ready";

  const displayRecords = useMemo(() => {
    if (state.kind !== "ok") return [];
    return sortNotificationsForDisplay(state.page.data, {
      operationalFirst: operationalOnly,
    });
  }, [state, operationalOnly]);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState((prev) => {
      if (prev.kind === "ok") return prev;
      return { kind: "loading" };
    });
    setIsRefreshing(true);
    try {
      const data = await fetchNotifications(token, {
        unread: unreadOnly,
        operational: operationalOnly,
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
      setState((prev) => (prev.kind === "ok" ? prev : { kind: "error", message }));
    } finally {
      setIsRefreshing(false);
    }
  }, [operationalOnly, page, unreadOnly]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function onMarkRead(record: NotificationRecord) {
    if (record.read_at !== null) return;
    const readAt = new Date().toISOString();
    setBusyId(record.id);
    setState((prev) => {
      if (prev.kind !== "ok") return prev;
      return {
        kind: "ok",
        page: {
          ...prev.page,
          data: prev.page.data.map((r) =>
            r.id === record.id ? { ...r, read_at: readAt } : r,
          ),
        },
      };
    });
    try {
      await inbox.markRead(record.id);
    } catch {
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onMarkAllRead() {
    const readAt = new Date().toISOString();
    setAllBusy(true);
    setState((prev) => {
      if (prev.kind !== "ok") return prev;
      return {
        kind: "ok",
        page: {
          ...prev.page,
          data: prev.page.data.map((r) =>
            r.read_at === null ? { ...r, read_at: readAt } : r,
          ),
        },
      };
    });
    try {
      await inbox.markAllRead();
    } catch {
      await load();
    } finally {
      setAllBusy(false);
    }
  }

  async function onSnoozeRebook(record: NotificationRecord) {
    if (record.type !== "appointment.rebook_suggested") return;
    const sourceId = record.data?.appointment_id;
    if (typeof sourceId !== "number" || sourceId <= 0) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setSnoozeBusyId(record.id);
    try {
      await snoozeRebookNudge(token, sourceId, 7);
      setSnoozedIds((prev) => {
        const next = new Set(prev);
        next.add(record.id);
        return next;
      });
      // Mark this notification as read once snoozed so the bell badge
      // and inbox state reflect the user has handled it.
      if (record.read_at === null) {
        await inbox.markRead(record.id);
      }
    } catch {
      // Soft-fail; user can retry.
    } finally {
      setSnoozeBusyId(null);
    }
  }

  const { inAppShell } = useShellPageChrome();

  return (
    <>
      {!inAppShell ? (
        <SiteHeader profile={profile} onSignOut={signOut} />
      ) : null}
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={inAppShell ? undefined : OZILCUTS_APP_NAME}
            title="Notifications"
            description="A calm inbox for reminders, booking updates, and shop alerts — grouped by day."
          />

          {profile.kind === "loading" ? (
            <div
              className="space-y-2"
              role="status"
              aria-busy="true"
              aria-label="Loading session"
            >
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-4 w-full max-w-md rounded-md" />
            </div>
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
                    variant={!unreadOnly && !operationalOnly ? "default" : "outline"}
                    onClick={() => {
                      setUnreadOnly(false);
                      setOperationalOnly(false);
                      setPage(1);
                    }}
                    aria-pressed={!unreadOnly && !operationalOnly}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={unreadOnly ? "default" : "outline"}
                    onClick={() => {
                      setUnreadOnly(true);
                      setOperationalOnly(false);
                      setPage(1);
                    }}
                    aria-pressed={unreadOnly}
                  >
                    Unread
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={operationalOnly ? "default" : "outline"}
                    onClick={() => {
                      setUnreadOnly(false);
                      setOperationalOnly(true);
                      setPage(1);
                    }}
                    aria-pressed={operationalOnly}
                  >
                    Operational
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onMarkAllRead()}
                    pending={allBusy}
                  >
                    Mark all read
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/profile/notifications">Preferences</Link>
                  </Button>
                </div>
              </div>

              {state.kind === "loading" || state.kind === "idle" ? (
                <NotificationListSkeleton rows={5} />
              ) : null}
              {state.kind === "error" ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}

              {state.kind === "ok" && state.page.data.length === 0 ? (
                <EmptyState
                  title="You&rsquo;re all caught up"
                  description={
                    unreadOnly
                      ? "No unread notifications."
                      : operationalOnly
                        ? "No operational alerts."
                        : "Notifications about your appointments will appear here."
                  }
                />
              ) : null}

              {state.kind === "ok" && state.page.data.length > 0 ? (
                <NotificationInboxList
                  records={displayRecords}
                  isRefreshing={isRefreshing}
                  renderActions={(row) => {
                    const bookFromRetention = isRetentionBookNotification(row.type);
                    const canSnoozeRebook = row.type === "appointment.rebook_suggested";
                    const rebookLink = bookFromRetention ? rebookHref(row) : null;
                    const primaryLink = bookFromRetention ? null : notificationPrimaryHref(row);
                    const unread = row.read_at === null;
                    const snoozed = snoozedIds.has(row.id);

                    return (
                      <div
                        className={cn(
                          "flex flex-wrap gap-2",
                          (busyId === row.id || allBusy) && "optimistic-row-pending",
                        )}
                      >
                        {rebookLink ? (
                          <Button asChild size="sm">
                            <Link
                              href={rebookLink}
                              onClick={() => {
                                if (unread) void onMarkRead(row);
                              }}
                            >
                              Book again
                            </Link>
                          </Button>
                        ) : null}
                        {canSnoozeRebook && !snoozed ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            pending={snoozeBusyId === row.id}
                            onClick={() => void onSnoozeRebook(row)}
                          >
                            Not now
                          </Button>
                        ) : null}
                        {primaryLink ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link
                              href={primaryLink}
                              onClick={() => {
                                if (unread) void onMarkRead(row);
                              }}
                            >
                              {primaryActionLabel(row)}
                            </Link>
                          </Button>
                        ) : null}
                        {unread ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={bookFromRetention ? "ghost" : "outline"}
                            pending={busyId === row.id}
                            onClick={() => void onMarkRead(row)}
                          >
                            Mark read
                          </Button>
                        ) : null}
                        {snoozed ? (
                          <p className="w-full text-caption text-muted-foreground" role="status">
                            Snoozed for 7 days.
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                />
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
    </>
  );
}
