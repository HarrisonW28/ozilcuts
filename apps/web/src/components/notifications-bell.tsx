"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { fetchNotificationUnreadCount } from "@ozilcuts/api";
import Link from "next/link";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

type Props = {
  /** Render nothing until the user is authenticated. */
  enabled: boolean;
};

export function NotificationsBell({ enabled }: Props) {
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return;
    }
    let cancelled = false;

    const tick = () => {
      const token = getStoredAuthToken();
      if (!token) return;
      fetchNotificationUnreadCount(token)
        .then((res) => {
          if (cancelled) return;
          setUnread(res.unread);
        })
        .catch(() => {
          // Soft-fail; the page-level inbox will surface real errors.
        });
    };

    tick();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);

    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);

  if (!enabled) return null;

  const label =
    unread === 0
      ? "Notifications"
      : `Notifications (${unread} unread)`;

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative inline-flex h-9 min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-background text-sm text-foreground transition-colors hover:bg-muted/60"
    >
      <span aria-hidden="true">
        {/* Inline bell glyph keeps the bundle slim — no icon dep. */}
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
