"use client";

import { SiteHeader } from "@/components/site-header";
import { NotificationListSkeleton } from "@/components/load-empty";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useInbox } from "@/lib/use-inbox";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchNotifications,
  snoozeRebookNudge,
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
  EmptyState,
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
  "appointment.reminder": "Appointment reminder",
  "appointment.running_late": "Running late",
  "appointment.rebook_suggested": "Time for your next visit",
  "appointment.inactivity_nudge": "It's been a while",
  "staff.booking.created": "New booking alert",
  "staff.booking.cancelled": "Cancellation alert",
  "staff.booking.rescheduled": "Reschedule alert",
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

function isRetentionBookNotification(type: NotificationEvent): boolean {
  return (
    type === "appointment.rebook_suggested" ||
    type === "appointment.inactivity_nudge"
  );
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
  if (record.type === "appointment.reminder") {
    const headline =
      typeof data.headline === "string" && data.headline.length > 0
        ? data.headline
        : "Reminder";
    return `${headline}${when ? ` · ${when}` : ""}`;
  }
  if (record.type === "appointment.running_late") {
    const mins =
      typeof data.late_by_minutes === "number" && data.late_by_minutes > 0
        ? data.late_by_minutes
        : null;
    const barberLine = barber ? `${service} with ${barber}` : service;
    const late =
      mins === 1 ? "about 1 minute late" : mins ? `about ${mins} minutes late` : "running late";
    return `${barberLine} — your barber is ${late}${when ? ` (${when})` : ""}.`;
  }
  if (
    record.type === "appointment.rebook_suggested"
    || record.type === "appointment.inactivity_nudge"
  ) {
    const interval =
      typeof data.interval_days === "number" && data.interval_days > 0
        ? data.interval_days
        : null;
    const suggestedRaw =
      typeof data.suggested_date === "string" ? data.suggested_date : null;
    const suggestedDate = suggestedRaw
      ? new Date(`${suggestedRaw}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : null;
    const cadence = interval
      ? interval === 7
        ? "about a week"
        : interval % 7 === 0
          ? `about ${Math.round(interval / 7)} weeks`
          : `about ${interval} days`
      : null;
    const target = barber
      ? `${service} with ${barber}`
      : service;
    if (record.type === "appointment.inactivity_nudge") {
      if (cadence && suggestedDate) {
        return `It's been ${cadence} since your last visit — still thinking about ${target}? Try ${suggestedDate}.`;
      }
      if (suggestedDate) {
        return `It's been a while — still thinking about ${target}? Try ${suggestedDate}.`;
      }
      return `It's been a while since your last visit — book ${target} when you're ready.`;
    }
    if (cadence && suggestedDate) {
      return `It's been ${cadence} since your last visit — try ${target} around ${suggestedDate}.`;
    }
    if (suggestedDate) {
      return `Try ${target} around ${suggestedDate}.`;
    }
    return `Time to rebook ${target}.`;
  }
  if (
    record.type === "staff.booking.created" ||
    record.type === "staff.booking.cancelled" ||
    record.type === "staff.booking.rescheduled"
  ) {
    const customer =
      typeof data.customer_name === "string" && data.customer_name.length > 0
        ? data.customer_name
        : "Customer";
    const actor =
      typeof data.actor_name === "string" && data.actor_name.length > 0
        ? ` · Action by ${data.actor_name}`
        : "";
    const previous =
      record.type === "staff.booking.rescheduled" &&
      typeof data.previous_starts_at === "string"
        ? ` · Was ${formatDateTime(data.previous_starts_at)}`
        : "";
    if (record.type === "staff.booking.created") {
      return `${customer} booked ${service}${when ? ` · ${when}` : ""}${actor}`;
    }
    if (record.type === "staff.booking.cancelled") {
      return `${customer} cancelled ${service}${when ? ` · ${when}` : ""}${actor}`;
    }
    return `${customer} rescheduled ${service}${when ? ` · ${when}` : ""}${previous}${actor}`;
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

/**
 * Deep-link to the booking flow with prefill from a rebook suggestion
 * payload, so customers can confirm in one tap.
 */
function rebookHref(record: NotificationRecord): string | null {
  if (!isRetentionBookNotification(record)) return null;
  const data = record.data;
  const params = new URLSearchParams();
  if (typeof data.service_id === "number" && data.service_id > 0) {
    params.set("service_id", String(data.service_id));
  }
  if (typeof data.barber_user_id === "number" && data.barber_user_id > 0) {
    params.set("barber_user_id", String(data.barber_user_id));
  }
  if (
    typeof data.suggested_date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(data.suggested_date)
  ) {
    params.set("date", data.suggested_date);
  }
  return `/book${params.size > 0 ? `?${params.toString()}` : ""}`;
}

export default function NotificationsPage() {
  const { profile, signOut } = useSessionProfile();
  const inbox = useInbox();
  const [page, setPage] = useState<number>(1);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [operationalOnly, setOperationalOnly] = useState<boolean>(false);
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [allBusy, setAllBusy] = useState<boolean>(false);
  const [snoozeBusyId, setSnoozeBusyId] = useState<number | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<number>>(new Set());

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
      setState({ kind: "error", message });
    }
  }, [operationalOnly, page, unreadOnly]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function onMarkRead(record: NotificationRecord) {
    if (record.read_at !== null) return;
    setBusyId(record.id);
    try {
      // Provider handles the API call + optimistic badge update so the
      // header bell stays in sync without waiting for the next poll.
      await inbox.markRead(record.id);
      await load();
    } catch {
      // Surface inline; non-fatal.
    } finally {
      setBusyId(null);
    }
  }

  async function onMarkAllRead() {
    setAllBusy(true);
    try {
      await inbox.markAllRead();
      await load();
    } catch {
      // Soft-fail; user can retry.
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
                <ul className="flex flex-col gap-3">
                  {state.page.data.map((row) => {
                    const bookFromRetention = isRetentionBookNotification(
                      row,
                    );
                    const canSnoozeRebook =
                      row.type === "appointment.rebook_suggested";
                    const rebookLink = bookFromRetention
                      ? rebookHref(row)
                      : null;
                    const apptLink = bookFromRetention
                      ? null
                      : appointmentHref(row);
                    const unread = row.read_at === null;
                    const snoozed = snoozedIds.has(row.id);
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
                            {snoozed ? (
                              <p
                                className="mt-2 text-xs text-muted-foreground"
                                role="status"
                              >
                                Snoozed for 7 days. We&rsquo;ll check back in
                                if you haven&rsquo;t booked by then.
                              </p>
                            ) : null}
                          </CardContent>
                          <CardFooter className="flex flex-wrap gap-2">
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
                                disabled={snoozeBusyId === row.id}
                                onClick={() => void onSnoozeRebook(row)}
                              >
                                {snoozeBusyId === row.id
                                  ? "Snoozing…"
                                  : "Not now"}
                              </Button>
                            ) : null}
                            {apptLink ? (
                              <Button asChild size="sm" variant="secondary">
                                <Link href={apptLink}>View appointment</Link>
                              </Button>
                            ) : null}
                            {unread && !bookFromRetention ? (
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
                            {unread && bookFromRetention ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
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
