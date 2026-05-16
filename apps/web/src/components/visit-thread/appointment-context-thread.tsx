"use client";

import {
  ApiValidationError,
  fetchAppointmentThread,
  markAppointmentThreadRead,
  postAppointmentThreadMessage,
} from "@ozilcuts/api";
import type { AppointmentThreadMessage } from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { abuseBlockedMessage, isAbuseBlockedError } from "@/lib/abuse-errors";
import { browserLooksOffline, isLikelyUnreachableNetwork } from "@/lib/network-errors";
import {
  THREAD_OUTBOX_FLUSH_EVENT,
  countThreadOutboxForAppointment,
  enqueueThreadOutboxItem,
} from "@/lib/thread-message-outbox";
import {
  readVisitThreadSnapshot,
  writeVisitThreadSnapshot,
} from "@/lib/visit-thread-cache";

import { VisitThreadComposer } from "./visit-thread-composer";
import { formatVisitThreadTime } from "./visit-thread-display";
import { VisitThreadErrorPanel } from "./visit-thread-error-panel";
import { VisitThreadLog } from "./visit-thread-log";
import { VisitThreadSkeleton } from "./visit-thread-skeleton";

function mergeVisitThreadMessages(
  prev: AppointmentThreadMessage[],
  incoming: AppointmentThreadMessage[],
): AppointmentThreadMessage[] {
  const map = new Map<number, AppointmentThreadMessage>();
  for (const m of prev) {
    map.set(m.id, m);
  }
  for (const m of incoming) {
    map.set(m.id, m);
  }
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

function shouldQueueThreadSend(error: unknown): boolean {
  if (error instanceof ApiValidationError) return false;
  return isLikelyUnreachableNetwork(error);
}

type ThreadState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

type MetaState = {
  unread_from_others: number;
  can_send: boolean;
  thread_closed_reason: "cancelled" | "ended" | null;
  operational_keys: string[];
  preset_keys: string[];
  in_arrival_messaging_window: boolean;
  viewer_last_read_message_id: number | null;
};

export function AppointmentContextThread(props: {
  appointmentId: number;
  token: string;
  viewerUserId: number;
  /** Barber or admin — shows shop-side operational chips. */
  isShopSide: boolean;
  /** ISO 8601 end time; used only for copy, server enforces send window. */
  endsAt: string | null;
}) {
  const { appointmentId, token, viewerUserId, isShopSide, endsAt } = props;

  const [threadState, setThreadState] = useState<ThreadState>({
    kind: "loading",
  });
  const [messages, setMessages] = useState<AppointmentThreadMessage[]>([]);
  const [meta, setMeta] = useState<MetaState | null>(null);
  const [sending, setSending] = useState(false);
  const [threadStaleFromCache, setThreadStaleFromCache] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [sendBlockedMessage, setSendBlockedMessage] = useState<string | null>(
    null,
  );
  const lastMarkedRead = useRef(0);

  const refreshOutboxCount = useCallback(() => {
    setOutboxCount(countThreadOutboxForAppointment(appointmentId));
  }, [appointmentId]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setThreadState((prev) =>
          prev.kind === "ok" ? prev : { kind: "loading" },
        );
      }
      try {
        const data = await fetchAppointmentThread(token, appointmentId);
        writeVisitThreadSnapshot(appointmentId, data);
        setThreadStaleFromCache(false);
        setMessages((prev) =>
          silent ? mergeVisitThreadMessages(prev, data.messages) : data.messages,
        );
        setMeta({
          unread_from_others: data.meta.unread_from_others,
          can_send: data.meta.can_send,
          thread_closed_reason: data.meta.thread_closed_reason,
          operational_keys: data.meta.operational_keys,
          preset_keys: data.meta.preset_keys,
          in_arrival_messaging_window: data.meta.in_arrival_messaging_window,
          viewer_last_read_message_id: data.meta.viewer_last_read_message_id,
        });
        setThreadState({ kind: "ok" });
      } catch (e: unknown) {
        if (!silent) {
          const snap = readVisitThreadSnapshot(appointmentId);
          const canUseCache =
            snap !== null &&
            (browserLooksOffline() || isLikelyUnreachableNetwork(e));
          if (canUseCache) {
            setMessages(snap.payload.messages);
            setMeta({
              unread_from_others: snap.payload.meta.unread_from_others,
              can_send: snap.payload.meta.can_send,
              thread_closed_reason: snap.payload.meta.thread_closed_reason,
              operational_keys: snap.payload.meta.operational_keys,
              preset_keys: snap.payload.meta.preset_keys,
              in_arrival_messaging_window:
                snap.payload.meta.in_arrival_messaging_window,
              viewer_last_read_message_id:
                snap.payload.meta.viewer_last_read_message_id,
            });
            setThreadStaleFromCache(true);
            setThreadState({ kind: "ok" });
          } else {
            const message =
              e instanceof Error
                ? e.message
                : "Could not load this booking thread.";
            setThreadState({ kind: "error", message });
            setMeta(null);
            setMessages([]);
          }
        }
      }
    },
    [appointmentId, token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    refreshOutboxCount();
  }, [refreshOutboxCount]);

  useEffect(() => {
    const onFlush = () => {
      refreshOutboxCount();
      void load({ silent: true });
    };
    const onOnline = () => void load({ silent: true });
    window.addEventListener(THREAD_OUTBOX_FLUSH_EVENT, onFlush);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener(THREAD_OUTBOX_FLUSH_EVENT, onFlush);
      window.removeEventListener("online", onOnline);
    };
  }, [load, refreshOutboxCount]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    }, 55_000);
    return () => window.clearInterval(t);
  }, [load]);

  const maxMessageId = useMemo(
    () =>
      messages.reduce(
        (m, x) => (x.id > 0 ? Math.max(m, x.id) : m),
        0,
      ),
    [messages],
  );

  useEffect(() => {
    if (maxMessageId <= 0 || maxMessageId <= lastMarkedRead.current) return;
    lastMarkedRead.current = maxMessageId;
    void markAppointmentThreadRead(token, appointmentId, maxMessageId).catch(
      () => {},
    );
  }, [appointmentId, maxMessageId, token]);

  const sendOperational = async (key: string) => {
    if (!meta?.can_send || sending) return;
    setSending(true);
    try {
      const { message } = await postAppointmentThreadMessage(
        token,
        appointmentId,
        {
          kind: "operational",
          operational_key: key,
        },
      );
      setMessages((prev) => mergeVisitThreadMessages(prev, [message]));
      void load({ silent: true });
    } catch (e: unknown) {
      if (shouldQueueThreadSend(e)) {
        enqueueThreadOutboxItem(appointmentId, {
          kind: "operational",
          operational_key: key,
        });
        refreshOutboxCount();
      }
    } finally {
      setSending(false);
    }
  };

  const sendPreset = async (key: string) => {
    if (!meta?.can_send || sending) return;
    setSending(true);
    try {
      const { message } = await postAppointmentThreadMessage(
        token,
        appointmentId,
        {
          kind: "preset",
          preset_key: key,
        },
      );
      setMessages((prev) => mergeVisitThreadMessages(prev, [message]));
      void load({ silent: true });
    } catch (e: unknown) {
      if (shouldQueueThreadSend(e)) {
        enqueueThreadOutboxItem(appointmentId, {
          kind: "preset",
          preset_key: key,
        });
        refreshOutboxCount();
      }
    } finally {
      setSending(false);
    }
  };

  const sendNote = async (body: string) => {
    if (!meta?.can_send || sending) return;
    const trimmed = body.trim();
    if (!trimmed) return;

    const tempId = -Math.abs(Math.floor(performance.now()));
    const optimistic: AppointmentThreadMessage = {
      id: tempId,
      appointment_id: appointmentId,
      kind: "note",
      operational_key: null,
      body: trimmed,
      sender: {
        id: viewerUserId,
        name: "You",
        role: isShopSide ? "barber" : "customer",
      },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => mergeVisitThreadMessages(prev, [optimistic]));
    setSending(true);
    setSendBlockedMessage(null);
    try {
      const { message } = await postAppointmentThreadMessage(
        token,
        appointmentId,
        {
          kind: "note",
          body: trimmed,
        },
      );
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return mergeVisitThreadMessages(withoutTemp, [message]);
      });
      void load({ silent: true });
    } catch (e: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (isAbuseBlockedError(e)) {
        setSendBlockedMessage(
          abuseBlockedMessage(e) ?? "That message could not be sent right now.",
        );
      } else if (shouldQueueThreadSend(e)) {
        enqueueThreadOutboxItem(appointmentId, {
          kind: "note",
          body: trimmed,
        });
        refreshOutboxCount();
      }
    } finally {
      setSending(false);
    }
  };

  const closedHint = (() => {
    if (!meta) return null;
    if (meta.thread_closed_reason === "cancelled") {
      return "This booking is not active — the thread is read-only.";
    }
    if (meta.thread_closed_reason === "ended") {
      return "This visit window has passed — the thread is read-only.";
    }
    return null;
  })();

  return (
    <Card size="sm" className="dashboard-surface">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">Booking thread</CardTitle>
          {meta && meta.unread_from_others > 0 ? (
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-micro font-semibold text-primary">
              {meta.unread_from_others} new from others
            </span>
          ) : null}
        </div>
        <CardDescription className="text-sm leading-relaxed">
          Operational updates for this visit only — short pings and quick replies,
          not open chat.{" "}
          {meta?.in_arrival_messaging_window ? (
            <span className="text-muted-foreground">
              During check-in, keep it calm: parking, outside, a gentle ETA, or
              when the chair is ready — all in one thread.{" "}
            </span>
          ) : null}
          {endsAt ? (
            <span className="text-muted-foreground">
              Slot ends {formatVisitThreadTime(endsAt)}.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {threadState.kind === "loading" ? <VisitThreadSkeleton /> : null}
        {threadState.kind === "error" ? (
          <VisitThreadErrorPanel
            message={threadState.message}
            onRetry={() => {
              void load();
            }}
          />
        ) : null}

        {threadState.kind === "ok" && meta ? (
          <>
            {threadStaleFromCache || outboxCount > 0 ? (
              <div
                role="status"
                className="space-y-1.5 rounded-lg border border-teal-500/30 bg-teal-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-foreground dark:border-teal-500/35 dark:bg-teal-500/[0.09]"
              >
                {threadStaleFromCache ? (
                  <p>
                    Showing the last saved version of this thread. Reconnect to
                    refresh live updates.
                  </p>
                ) : null}
                {outboxCount > 0 ? (
                  <p>
                    {outboxCount === 1
                      ? "1 update is queued and will send when the network is stable."
                      : `${outboxCount} updates are queued and will send when the network is stable.`}
                  </p>
                ) : null}
              </div>
            ) : null}

            {sendBlockedMessage ? (
              <p
                className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
                role="alert"
              >
                {sendBlockedMessage}
              </p>
            ) : null}

            <VisitThreadComposer
              appointmentId={appointmentId}
              meta={meta}
              isShopSide={isShopSide}
              sending={sending}
              authToken={token}
              onSendOperational={(key) => void sendOperational(key)}
              onSendPreset={(key) => void sendPreset(key)}
              onSendNote={(b) => sendNote(b)}
            />

            {meta.can_send &&
            messages.length === 0 &&
            (meta.operational_keys.length > 0 || meta.preset_keys.length > 0) ? (
              <p className="text-sm text-muted-foreground" role="status">
                No log entries yet — use a ping above to post the first line.
              </p>
            ) : null}

            {!meta.can_send && messages.length === 0 ? (
              <EmptyState
                title="Nothing in this thread yet"
                description="When the shop or guest posts an operational update, it will appear in the log."
              />
            ) : null}

            <VisitThreadLog
              messages={messages}
              viewerUserId={viewerUserId}
              viewerLastReadMessageId={meta.viewer_last_read_message_id}
            />

            {!meta.can_send && closedHint ? (
              <p className="text-sm text-muted-foreground" role="status">
                {closedHint}
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
