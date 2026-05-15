"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { dedupeInboxNotificationArrivals } from "@/lib/inbox-arrival-dedupe";
import {
  fetchNotificationUnreadCount,
  fetchNotifications,
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
} from "@ozilcuts/api";
import type { NotificationRecord } from "@ozilcuts/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Polling cadence for the in-app bell. Visible-tab is fast enough to feel
 * near-real-time without hammering the API; hidden-tab slows down so we
 * don't waste cycles for inactive sessions. Tab focus also triggers a
 * one-shot refresh so returning to the app feels instant.
 */
const POLL_VISIBLE_MS = 15_000;
const POLL_HIDDEN_MS = 60_000;
/** How many of the most recent items to keep in memory for the popover. */
const POPOVER_LIMIT = 5;

type InboxContextValue = {
  enabled: boolean;
  unread: number;
  latest: NotificationRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  /**
   * Notifications that arrived since the provider mounted, awaiting
   * acknowledgement by a UI consumer (e.g. the toaster). The first poll
   * after mount never emits arrivals so existing unread items don't pop.
   */
  newArrivals: NotificationRecord[];
  dismissArrival: (id: number) => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

type ProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function InboxProvider({ enabled, children }: ProviderProps) {
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newArrivals, setNewArrivals] = useState<NotificationRecord[]>([]);

  // IDs we've already observed; used to detect arrivals across polls.
  // A null sentinel means "first fetch hasn't completed yet".
  const seenIdsRef = useRef<Set<number> | null>(null);
  const inFlightRef = useRef(false);

  const tick = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    const token = getStoredAuthToken();
    if (!token) return;

    inFlightRef.current = true;
    try {
      const [countRes, listRes] = await Promise.all([
        fetchNotificationUnreadCount(token),
        fetchNotifications(token, { perPage: POPOVER_LIMIT, page: 1 }),
      ]);
      setUnread(countRes.unread);
      setLatest(listRes.data);
      setError(null);

      const previouslySeen = seenIdsRef.current;
      const currentIds = new Set(listRes.data.map((n) => n.id));
      if (previouslySeen === null) {
        // Initial load: prime the seen set without emitting toasts.
        seenIdsRef.current = currentIds;
      } else {
        const arrivals = dedupeInboxNotificationArrivals(
          listRes.data.filter(
            (n) => !previouslySeen.has(n.id) && n.read_at === null,
          ),
        );
        if (arrivals.length > 0) {
          setNewArrivals((queue) => {
            const queued = new Set(queue.map((n) => n.id));
            const fresh = arrivals.filter((n) => !queued.has(n.id));
            if (fresh.length === 0) return queue;
            return dedupeInboxNotificationArrivals([...fresh, ...queue]);
          });
        }
        seenIdsRef.current = currentIds;
      }
    } catch (err: unknown) {
      // Soft-fail: keep last known values so the badge doesn't flicker.
      setError(err instanceof Error ? err.message : "Inbox fetch failed");
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled]);

  // Visibility-aware polling loop using a re-arming setTimeout so the
  // cadence can change when the tab visibility flips.
  useEffect(() => {
    if (!enabled) {
      seenIdsRef.current = null;
      setUnread(0);
      setLatest([]);
      setNewArrivals([]);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const schedule = () => {
      if (cancelled) return;
      const isVisible =
        typeof document !== "undefined"
          ? document.visibilityState === "visible"
          : true;
      const delay = isVisible ? POLL_VISIBLE_MS : POLL_HIDDEN_MS;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        setIsLoading(true);
        await tick();
        setIsLoading(false);
        schedule();
      }, delay);
    };

    // Kick off immediately, then enter the polling loop.
    setIsLoading(true);
    void tick().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
        schedule();
      }
    });

    const onFocus = () => {
      void tick();
    };
    const onVisibility = () => {
      // Re-arm at the new cadence and refresh on becoming visible.
      if (timer !== undefined) window.clearTimeout(timer);
      if (document.visibilityState === "visible") {
        void tick();
      }
      schedule();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, tick]);

  const refresh = useCallback(async () => {
    await tick();
  }, [tick]);

  const markRead = useCallback(
    async (id: number) => {
      const token = getStoredAuthToken();
      if (!token) return;
      // Optimistic: drop unread count and stamp the row as read locally.
      setUnread((prev) => Math.max(0, prev - 1));
      setLatest((prev) =>
        prev.map((row) =>
          row.id === id && row.read_at === null
            ? { ...row, read_at: new Date().toISOString() }
            : row,
        ),
      );
      try {
        await apiMarkRead(token, id);
      } catch {
        // Re-sync on failure so the UI doesn't stay stale.
        await tick();
      }
    },
    [tick],
  );

  const markAllRead = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    setUnread(0);
    setLatest((prev) =>
      prev.map((row) =>
        row.read_at === null
          ? { ...row, read_at: new Date().toISOString() }
          : row,
      ),
    );
    try {
      await apiMarkAllRead(token);
    } catch {
      await tick();
    }
  }, [tick]);

  const dismissArrival = useCallback((id: number) => {
    setNewArrivals((queue) => queue.filter((n) => n.id !== id));
  }, []);

  const value = useMemo<InboxContextValue>(
    () => ({
      enabled,
      unread,
      latest,
      isLoading,
      error,
      refresh,
      markRead,
      markAllRead,
      newArrivals,
      dismissArrival,
    }),
    [
      enabled,
      unread,
      latest,
      isLoading,
      error,
      refresh,
      markRead,
      markAllRead,
      newArrivals,
      dismissArrival,
    ],
  );

  return (
    <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
  );
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (ctx === null) {
    throw new Error("useInbox must be used inside an <InboxProvider>");
  }
  return ctx;
}
