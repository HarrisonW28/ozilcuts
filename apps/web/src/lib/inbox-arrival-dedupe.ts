import type { NotificationRecord } from "@ozilcuts/types";

/**
 * Collapse duplicate operational pings (e.g. retried proximity) so the
 * toaster stays calm — one surface per appointment + event shape.
 */
export function dedupeInboxNotificationArrivals(
  arrivals: NotificationRecord[],
): NotificationRecord[] {
  const byKey = new Map<string, NotificationRecord>();

  for (const n of arrivals) {
    let key = `id:${n.id}`;
    if (n.type === "staff.arrival_nearby") {
      const aid = n.data.appointment_id;
      if (typeof aid === "number" && aid > 0) {
        key = `staff-arrival-nearby:${aid}`;
      }
    } else if (n.type === "staff.arrival_checked_in") {
      const aid = n.data.appointment_id;
      if (typeof aid === "number" && aid > 0) {
        key = `staff-arrival-checked-in:${aid}`;
      }
    } else if (n.type === "appointment.arrival_nearby") {
      const aid = n.data.appointment_id;
      if (typeof aid === "number" && aid > 0) {
        key = `appointment-arrival-nearby:${aid}`;
      }
    }

    const existing = byKey.get(key);
    if (!existing || n.id > existing.id) {
      byKey.set(key, n);
    }
  }

  return [...byKey.values()].sort((a, b) => b.id - a.id);
}
