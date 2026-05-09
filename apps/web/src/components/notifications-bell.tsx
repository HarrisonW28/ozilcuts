"use client";

import { useInbox } from "@/lib/use-inbox";
import type { NotificationEvent, NotificationRecord } from "@ozilcuts/types";
import { Button } from "@ozilcuts/ui";
import Link from "next/link";
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

const EVENT_LABELS: Record<NotificationEvent, string> = {
  "appointment.confirmed": "Appointment confirmed",
  "appointment.cancelled": "Appointment cancelled",
  "appointment.rescheduled": "Appointment rescheduled",
  "appointment.reminder": "Appointment reminder",
  "appointment.rebook_suggested": "Time for your next visit",
  "staff.booking.created": "New booking",
  "staff.booking.cancelled": "Booking cancelled",
  "staff.booking.rescheduled": "Booking rescheduled",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  const days = Math.floor(diffSeconds / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function describeShort(record: NotificationRecord): string {
  const data = record.data;
  const service =
    typeof data.service_name === "string" && data.service_name.length > 0
      ? data.service_name
      : "your appointment";
  const barber =
    typeof data.barber_name === "string" && data.barber_name.length > 0
      ? data.barber_name
      : null;
  const customer =
    typeof data.customer_name === "string" && data.customer_name.length > 0
      ? data.customer_name
      : null;

  if (record.type === "appointment.confirmed") {
    return barber ? `${service} with ${barber}` : service;
  }
  if (record.type === "appointment.cancelled") {
    return barber ? `${service} with ${barber} cancelled` : `${service} cancelled`;
  }
  if (record.type === "appointment.rescheduled") {
    return barber ? `${service} with ${barber} moved` : `${service} moved`;
  }
  if (record.type === "appointment.reminder") {
    return typeof data.headline === "string" && data.headline.length > 0
      ? data.headline
      : `Reminder · ${service}`;
  }
  if (record.type === "appointment.rebook_suggested") {
    const target = barber ? `${service} with ${barber}` : service;
    return `Rebook ${target}`;
  }
  if (record.type === "staff.booking.created") {
    return `${customer ?? "Customer"} booked ${service}`;
  }
  if (record.type === "staff.booking.cancelled") {
    return `${customer ?? "Customer"} cancelled ${service}`;
  }
  if (record.type === "staff.booking.rescheduled") {
    return `${customer ?? "Customer"} rescheduled ${service}`;
  }
  return EVENT_LABELS[record.type] ?? record.type;
}

function primaryHref(record: NotificationRecord): string | null {
  if (record.type === "appointment.rebook_suggested") {
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
  const id = record.data?.appointment_id;
  if (typeof id === "number" && id > 0) {
    return `/appointments/${id}/confirmation`;
  }
  return null;
}

function primaryLabel(record: NotificationRecord): string {
  return record.type === "appointment.rebook_suggested" ? "Book" : "View";
}

export function NotificationsBell({ enabled }: Props) {
  const inbox = useInbox();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = useId();

  // Close on outside click and Escape.
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
        className="relative inline-flex h-9 min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-background text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true">
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
      </button>

      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-50 w-auto rounded-lg border border-border bg-background shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium text-foreground">
              Notifications
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={unread === 0}
              onClick={() => void markAllRead()}
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error && latest.length === 0 ? (
              <p
                className="px-3 py-6 text-center text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {isLoading && latest.length === 0 ? (
              <p
                className="px-3 py-6 text-center text-sm text-muted-foreground"
                role="status"
              >
                Loading…
              </p>
            ) : null}

            {!isLoading && latest.length === 0 && !error ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                You&rsquo;re all caught up.
              </p>
            ) : null}

            {latest.length > 0 ? (
              <ul className="divide-y divide-border">
                {latest.map((row) => {
                  const href = primaryHref(row);
                  const isUnread = row.read_at === null;
                  return (
                    <li key={row.id} className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={
                            "mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full " +
                            (isUnread ? "bg-primary" : "bg-transparent")
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {EVENT_LABELS[row.type] ?? row.type}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {describeShort(row)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatRelative(row.created_at)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {href ? (
                              <Button
                                asChild
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                              >
                                <Link
                                  href={href}
                                  onClick={() => {
                                    if (isUnread) void markRead(row.id);
                                    setOpen(false);
                                  }}
                                >
                                  {primaryLabel(row)}
                                </Link>
                              </Button>
                            ) : null}
                            {isUnread ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => void markRead(row.id)}
                              >
                                Mark read
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="border-t border-border px-3 py-2 text-right">
            <Link
              href="/notifications"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setOpen(false)}
            >
              See all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
