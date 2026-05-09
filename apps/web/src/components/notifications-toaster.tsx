"use client";

import { useInbox } from "@/lib/use-inbox";
import type { NotificationEvent, NotificationRecord } from "@ozilcuts/types";
import Link from "next/link";
import { useEffect } from "react";

const TOAST_TTL_MS = 6_000;
/** Cap so a flood doesn't blanket the screen. */
const MAX_VISIBLE = 3;

const EVENT_LABELS: Record<NotificationEvent, string> = {
  "appointment.confirmed": "Appointment confirmed",
  "appointment.cancelled": "Appointment cancelled",
  "appointment.rescheduled": "Appointment rescheduled",
  "appointment.reminder": "Appointment reminder",
  "staff.booking.created": "New booking",
  "staff.booking.cancelled": "Booking cancelled",
  "staff.booking.rescheduled": "Booking rescheduled",
};

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
    return barber ? `${service} with ${barber} confirmed` : `${service} confirmed`;
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

function appointmentHref(record: NotificationRecord): string | null {
  const id = record.data?.appointment_id;
  if (typeof id === "number" && id > 0) {
    return `/appointments/${id}/confirmation`;
  }
  return null;
}

export function NotificationsToaster() {
  const { newArrivals, dismissArrival, markRead } = useInbox();
  const visible = newArrivals.slice(0, MAX_VISIBLE);

  // Auto-dismiss each toast after a short window.
  useEffect(() => {
    if (visible.length === 0) return;
    const timers = visible.map((row) =>
      window.setTimeout(() => dismissArrival(row.id), TOAST_TTL_MS),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [visible, dismissArrival]);

  if (visible.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Recent notifications"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-4 left-4 z-[60] flex flex-col-reverse gap-2 sm:left-auto sm:w-80"
    >
      {visible.map((row) => {
        const href = appointmentHref(row);
        return (
          <div
            key={row.id}
            role="status"
            className="pointer-events-auto rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {EVENT_LABELS[row.type] ?? row.type}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {describeShort(row)}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {href ? (
                    <Link
                      href={href}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => {
                        void markRead(row.id);
                        dismissArrival(row.id);
                      }}
                    >
                      View
                    </Link>
                  ) : null}
                  <Link
                    href="/notifications"
                    className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => dismissArrival(row.id)}
                  >
                    Open inbox
                  </Link>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                className="ml-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                onClick={() => dismissArrival(row.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
