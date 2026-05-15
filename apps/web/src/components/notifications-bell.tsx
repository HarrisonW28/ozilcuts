"use client";

import { NotificationBellPanel } from "@/components/notifications";
import { useInbox } from "@/lib/use-inbox";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Props = {
  /** Render nothing until the user is authenticated. */
  enabled: boolean;
};

export function NotificationsBell({ enabled }: Props) {
  const inbox = useInbox();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) void inbox.refresh();
      return next;
    });
  }, [inbox]);

  if (!enabled || !inbox.enabled) return null;

  const { unread, latest, isLoading, error, markRead, markAllRead } = inbox;
  const label =
    unread === 0 ? "Notifications" : `Notifications (${unread} unread)`;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleToggle}
        className="motion-interactive relative inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md border border-border bg-background text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:min-h-9 sm:min-w-9"
      >
        <span aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
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
            className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground motion-safe:animate-pulse"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
        <span className="sr-only">{label}</span>
      </button>

      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Notifications"
          className="motion-popover fixed inset-x-2 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-50 max-h-[min(calc(100dvh-4.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)),32rem)] w-auto overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(70vh,32rem)] sm:w-80 dark:border-border/50 dark:bg-background/95"
        >
          <NotificationBellPanel
            latest={latest}
            isLoading={isLoading}
            error={error}
            unread={unread}
            onMarkRead={(id) => void markRead(id)}
            onMarkAllRead={() => void markAllRead()}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
