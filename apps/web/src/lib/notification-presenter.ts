import type {
  NotificationData,
  NotificationEvent,
  NotificationRecord,
} from "@ozilcuts/types";

/** Premium short titles for list rows and toasts. */
export const NOTIFICATION_TITLES: Record<NotificationEvent, string> = {
  "appointment.confirmed": "You're booked",
  "appointment.cancelled": "Booking cancelled",
  "appointment.rescheduled": "Time updated",
  "appointment.reminder": "Visit reminder",
  "appointment.running_late": "Running behind",
  "appointment.rebook_suggested": "Ready for another visit?",
  "appointment.inactivity_nudge": "We'd love to see you",
  "appointment.arrival_nearby": "Near the shop",
  "appointment.visit_message": "Visit message",
  "staff.booking.created": "New booking",
  "staff.booking.cancelled": "Guest cancelled",
  "staff.booking.rescheduled": "Guest rescheduled",
  "staff.arrival_nearby": "Guest nearby",
  "staff.arrival_checked_in": "Guest checked in",
  "staff.visit_message": "Guest update",
};

export type NotificationVisualKind =
  | "operational"
  | "retention"
  | "reminder"
  | "lifecycle"
  | "proximity"
  | "messaging"
  | "messaging_staff";

export function isVisitThreadNotificationType(
  type: NotificationEvent,
): boolean {
  return (
    type === "appointment.visit_message" || type === "staff.visit_message"
  );
}

export function notificationVisualKind(
  type: NotificationEvent,
): NotificationVisualKind {
  if (type === "staff.visit_message") return "messaging_staff";
  if (type === "appointment.visit_message") return "messaging";
  if (
    type === "staff.arrival_nearby" ||
    type === "staff.arrival_checked_in"
  ) {
    return "proximity";
  }
  if (type.startsWith("staff.")) return "operational";
  if (type === "appointment.arrival_nearby") return "proximity";
  if (
    type === "appointment.rebook_suggested" ||
    type === "appointment.inactivity_nudge"
  ) {
    return "retention";
  }
  if (type === "appointment.reminder") return "reminder";
  return "lifecycle";
}

export function notificationAccentClass(kind: NotificationVisualKind): string {
  switch (kind) {
    case "operational":
      return "border-l-[3px] border-l-amber-500/85 bg-gradient-to-r from-amber-500/[0.06] to-transparent dark:from-amber-400/[0.08]";
    case "messaging_staff":
      return "border-l-[3px] border-l-amber-500/90 bg-gradient-to-r from-amber-500/[0.07] to-transparent dark:from-amber-400/[0.1]";
    case "messaging":
      return "border-l-[3px] border-l-indigo-500/75 bg-gradient-to-r from-indigo-500/[0.06] to-transparent dark:from-indigo-400/[0.09]";
    case "retention":
      return "border-l-[3px] border-l-violet-500/80 bg-gradient-to-r from-violet-500/[0.06] to-transparent dark:from-violet-400/[0.09]";
    case "reminder":
      return "border-l-[3px] border-l-sky-500/80 bg-gradient-to-r from-sky-500/[0.06] to-transparent dark:from-sky-400/[0.09]";
    case "proximity":
      return "border-l-[3px] border-l-teal-500/80 bg-gradient-to-r from-teal-500/[0.07] to-transparent dark:from-teal-400/[0.09]";
    default:
      return "border-l-[3px] border-l-primary/35 bg-gradient-to-r from-primary/[0.04] to-transparent dark:from-primary/[0.07]";
  }
}

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

export function notificationCreatedDayKey(
  iso: string | null | undefined,
): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayGroupHeading(
  dayKey: string,
  nowMs: number = Date.now(),
): string {
  if (dayKey === "unknown") return "Earlier";

  const [ys, ms, ds] = dayKey.split("-").map((s) => Number.parseInt(s, 10));
  if (!ys || !ms || !ds) return dayKey;

  const target = new Date(ys, ms - 1, ds);
  const today = new Date(nowMs);
  const t0 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const d0 = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  const diffDays = Math.round((t0 - d0) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === 2) return "Two days ago";

  return target.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export type NotificationDayGroup = {
  dayKey: string;
  heading: string;
  items: NotificationRecord[];
};

/**
 * Group by calendar day of `created_at` (newest days first).
 */
export function groupNotificationsByDay(
  records: NotificationRecord[],
  nowMs: number = Date.now(),
): NotificationDayGroup[] {
  const buckets = new Map<string, NotificationRecord[]>();
  for (const r of records) {
    const key = notificationCreatedDayKey(r.created_at);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  const keys = [...buckets.keys()].filter((k) => k !== "unknown").sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
  const unknown = buckets.get("unknown");
  const out: NotificationDayGroup[] = keys.map((dayKey) => ({
    dayKey,
    heading: formatDayGroupHeading(dayKey, nowMs),
    items: buckets.get(dayKey) ?? [],
  }));
  if (unknown?.length) {
    out.push({
      dayKey: "unknown",
      heading: "Earlier",
      items: unknown,
    });
  }
  return out;
}

function reminderTimingPhrase(startsAt: string | null | undefined): string {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const now = Date.now();
  const diffMs = start.getTime() - now;
  const hours = diffMs / 3_600_000;
  if (hours >= 0 && hours < 2) return "Starting very soon";
  if (hours >= 0 && hours < 24) {
    const h = Math.max(1, Math.round(hours));
    return h === 1 ? "In about an hour" : `In about ${h} hours`;
  }
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime();
  const today = new Date();
  const today0 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const dayDiff = Math.round((startDay - today0) / 86_400_000);
  if (dayDiff === 1) return "Tomorrow";
  if (dayDiff === 2) return "Day after tomorrow";
  if (dayDiff > 2 && dayDiff <= 7)
    return start.toLocaleDateString(undefined, { weekday: "long" });
  return "";
}

export function getNotificationDisplayTitle(
  record: NotificationRecord,
): string {
  if (record.type === "appointment.reminder") {
    const data = record.data;
    const when =
      typeof data.starts_at === "string" ? data.starts_at : null;
    const timing = reminderTimingPhrase(when);
    if (timing) return `${NOTIFICATION_TITLES[record.type]} · ${timing}`;
    const headline =
      typeof data.headline === "string" && data.headline.trim().length > 0
        ? data.headline.trim()
        : null;
    if (headline) return headline;
  }
  if (record.type === "appointment.arrival_nearby") {
    const eta =
      typeof record.data.approximate_eta_minutes === "number" &&
      record.data.approximate_eta_minutes > 0
        ? record.data.approximate_eta_minutes
        : null;
    const base = NOTIFICATION_TITLES[record.type];
    if (eta) return `${base} · ~${eta} min walk`;
    return base;
  }
  return NOTIFICATION_TITLES[record.type] ?? record.type;
}

export function isRetentionBookNotification(type: NotificationEvent): boolean {
  return (
    type === "appointment.rebook_suggested" ||
    type === "appointment.inactivity_nudge"
  );
}

/** Full sentence body for inbox and detail surfaces. */
export function getNotificationBody(record: NotificationRecord): string {
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
      ? `${service} with ${barber} is now set for ${when}`
      : `${service} is now set for ${when}`;
    return previous ? `${base} (previously ${previous}).` : `${base}.`;
  }
  if (record.type === "appointment.reminder") {
    const headline =
      typeof data.headline === "string" && data.headline.length > 0
        ? data.headline
        : "Reminder";
    const timing = reminderTimingPhrase(
      typeof data.starts_at === "string" ? data.starts_at : null,
    );
    const kind =
      typeof data.reminder_kind === "string" ? data.reminder_kind : null;
    const kindNote =
      kind === "day_before"
        ? "We'll see you tomorrow"
        : kind === "hour_before"
          ? "Heads-up before you leave"
          : null;
    const parts = [headline];
    if (kindNote) parts.push(kindNote);
    if (when) parts.push(when);
    if (timing) parts.push(timing);
    return parts.join(" · ");
  }
  if (record.type === "appointment.running_late") {
    const mins =
      typeof data.late_by_minutes === "number" && data.late_by_minutes > 0
        ? data.late_by_minutes
        : null;
    const barberLine = barber ? `${service} with ${barber}` : service;
    const late =
      mins === 1
        ? "about one minute behind"
        : mins
          ? `about ${mins} minutes behind`
          : "running a little behind";
    return `${barberLine} — your barber is ${late}${when ? ` (${when}).` : "."}`;
  }
  if (
    record.type === "appointment.rebook_suggested" ||
    record.type === "appointment.inactivity_nudge"
  ) {
    const interval =
      typeof data.interval_days === "number" && data.interval_days > 0
        ? data.interval_days
        : null;
    const suggestedRaw =
      typeof data.suggested_date === "string" ? data.suggested_date : null;
    const suggestedDate = suggestedRaw
      ? new Date(`${suggestedRaw}T12:00:00`).toLocaleDateString(undefined, {
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
    const target = barber ? `${service} with ${barber}` : service;
    if (record.type === "appointment.inactivity_nudge") {
      if (cadence && suggestedDate) {
        return `It's been ${cadence} since your last visit — still thinking about ${target}? A calm window could be ${suggestedDate}.`;
      }
      if (suggestedDate) {
        return `It's been a while — still thinking about ${target}? ${suggestedDate} is open if it suits you.`;
      }
      return `It's been a while since your last visit — book ${target} whenever you're ready.`;
    }
    if (cadence && suggestedDate) {
      return `It's been ${cadence} since your last visit — ${suggestedDate} could work nicely for ${target}.`;
    }
    if (suggestedDate) {
      return `Try ${target} around ${suggestedDate}.`;
    }
    return `Time to rebook ${target}.`;
  }
  if (record.type === "appointment.arrival_nearby") {
    const eta =
      typeof data.approximate_eta_minutes === "number" &&
      data.approximate_eta_minutes > 0
        ? data.approximate_eta_minutes
        : null;
    const bucket =
      typeof data.distance_bucket_m === "number" && data.distance_bucket_m > 0
        ? data.distance_bucket_m
        : null;
    const walk =
      eta === null
        ? "a short walk"
        : eta === 1
          ? "~1 minute walk"
          : `~${eta} minute walk`;
    const dist = bucket ? `within about ${bucket} m` : "nearby";
    const who = barber ? `${service} with ${barber}` : service;
    return `You are ${dist} (${walk}). When you step inside, tap check-in for ${who}${when ? ` · ${when}` : ""}.`;
  }
  if (record.type === "staff.arrival_nearby") {
    const eta =
      typeof data.approximate_eta_minutes === "number" &&
      data.approximate_eta_minutes > 0
        ? data.approximate_eta_minutes
        : null;
    const customerName =
      typeof data.customer_name === "string" && data.customer_name.length > 0
        ? data.customer_name
        : "A guest";
    const etaBit =
      eta === null ? "" : eta === 1 ? " About a minute out on foot." : ` About ${eta} minutes out on foot.`;
    return `${customerName} is near the shop for ${service}${when ? ` (${when})` : ""}.${etaBit}`;
  }
  if (record.type === "staff.arrival_checked_in") {
    const customerName =
      typeof data.customer_name === "string" && data.customer_name.length > 0
        ? data.customer_name
        : "A guest";
    return `${customerName} checked in for ${service}${when ? ` (${when})` : ""}. Seat them when it feels right.`;
  }
  if (
    record.type === "staff.booking.created" ||
    record.type === "staff.booking.cancelled" ||
    record.type === "staff.booking.rescheduled"
  ) {
    const customer =
      typeof data.customer_name === "string" && data.customer_name.length > 0
        ? data.customer_name
        : "Guest";
    const actor =
      typeof data.actor_name === "string" && data.actor_name.length > 0
        ? ` (${data.actor_name})`
        : "";
    const previous =
      record.type === "staff.booking.rescheduled" &&
      typeof data.previous_starts_at === "string"
        ? ` Previously ${formatDateTime(data.previous_starts_at)}.`
        : "";
    if (record.type === "staff.booking.created") {
      return `${customer} booked ${service}${when ? ` for ${when}` : ""}.${actor}`;
    }
    if (record.type === "staff.booking.cancelled") {
      return `${customer} cancelled ${service}${when ? ` (${when})` : ""}.${actor}`;
    }
    return `${customer} rescheduled ${service}${when ? ` to ${when}` : ""}.${previous}${actor}`;
  }
  return NOTIFICATION_TITLES[record.type] ?? record.type;
}

/** Compact line for bell, toasts, and home preview. */
export function getNotificationShortLine(record: NotificationRecord): string {
  const data = record.data;
  const service =
    typeof data.service_name === "string" && data.service_name.length > 0
      ? data.service_name
      : "Appointment";
  const barber =
    typeof data.barber_name === "string" && data.barber_name.length > 0
      ? data.barber_name
      : null;
  const customer =
    typeof data.customer_name === "string" && data.customer_name.length > 0
      ? data.customer_name
      : null;

  if (record.type === "appointment.confirmed") {
    return barber ? `${service} · ${barber}` : service;
  }
  if (record.type === "appointment.cancelled") {
    return barber ? `${service} · ${barber}` : service;
  }
  if (record.type === "appointment.rescheduled") {
    return barber ? `${service} · ${barber}` : service;
  }
  if (record.type === "appointment.reminder") {
    const timing = reminderTimingPhrase(
      typeof data.starts_at === "string" ? data.starts_at : null,
    );
    const headline =
      typeof data.headline === "string" && data.headline.trim().length > 0
        ? data.headline.trim()
        : null;
    if (headline && timing) return `${headline} · ${timing}`;
    if (headline) return headline;
    if (timing) return `${service} · ${timing}`;
    return `${service} reminder`;
  }
  if (record.type === "appointment.running_late") {
    const mins =
      typeof data.late_by_minutes === "number" && data.late_by_minutes > 0
        ? data.late_by_minutes
        : null;
    const late =
      mins === 1 ? "~1 min late" : mins ? `~${mins} min late` : "Behind schedule";
    return barber ? `${late} · ${barber}` : late;
  }
  if (record.type === "appointment.rebook_suggested") {
    const target = barber ? `${service} · ${barber}` : service;
    return `Rebook ${target}`;
  }
  if (record.type === "appointment.inactivity_nudge") {
    const target = barber ? `${service} · ${barber}` : service;
    return `Still thinking about ${target}?`;
  }
  if (record.type === "appointment.arrival_nearby") {
    const eta =
      typeof data.approximate_eta_minutes === "number" &&
      data.approximate_eta_minutes > 0
        ? data.approximate_eta_minutes
        : null;
    const bit = eta ? `~${eta} min walk` : "Nearby";
    return barber ? `${bit} · ${barber}` : bit;
  }
  if (record.type === "staff.arrival_nearby") {
    const eta =
      typeof data.approximate_eta_minutes === "number" &&
      data.approximate_eta_minutes > 0
        ? data.approximate_eta_minutes
        : null;
    const bit = eta ? `~${eta} min out` : "Nearby";
    return `${customer ?? "Guest"} · ${service} · ${bit}`;
  }
  if (record.type === "staff.arrival_checked_in") {
    return `${customer ?? "Guest"} · ${service} · Checked in`;
  }
  if (record.type === "staff.booking.created") {
    return `${customer ?? "Guest"} · ${service}`;
  }
  if (record.type === "staff.booking.cancelled") {
    return `${customer ?? "Guest"} · ${service}`;
  }
  if (record.type === "staff.booking.rescheduled") {
    return `${customer ?? "Guest"} · ${service}`;
  }
  return NOTIFICATION_TITLES[record.type] ?? record.type;
}

export function appointmentHref(record: NotificationRecord): string | null {
  const id = record.data?.appointment_id;
  if (typeof id === "number" && id > 0) {
    return `/appointments/${id}/confirmation`;
  }
  return null;
}

export function rebookHref(record: NotificationRecord): string | null {
  if (!isRetentionBookNotification(record.type)) return null;
  const data = record.data;
  const params = new URLSearchParams();
  if (typeof data.service_id === "number" && data.service_id > 0) {
    params.set("service_id", String(data.service_id));
  }
  if (typeof data.barber_user_id === "number" && data.barber_user_id > 0) {
    params.set("barber_user_id", String(data.barber_user_id));
  }
  if (
    typeof data.suggested_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.suggested_date)
  ) {
    params.set("date", data.suggested_date);
  }
  return `/book${params.size > 0 ? `?${params.toString()}` : ""}`;
}

export function notificationPrimaryHref(
  record: NotificationRecord,
): string | null {
  return rebookHref(record) ?? appointmentHref(record);
}

export function formatRelativeNotificationTime(
  iso: string | null,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSeconds = Math.floor((nowMs - d.getTime()) / 1000);
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

export function primaryActionLabel(record: NotificationRecord): string {
  if (
    record.type === "appointment.rebook_suggested" ||
    record.type === "appointment.inactivity_nudge"
  ) {
    return "Book again";
  }
  if (isVisitThreadNotificationType(record.type)) {
    return "Open thread";
  }
  return "View";
}

export const OPERATIONAL_ALERT_TYPES: NotificationEvent[] = [
  "staff.booking.created",
  "staff.booking.cancelled",
  "staff.booking.rescheduled",
  "staff.arrival_nearby",
  "staff.arrival_checked_in",
  "staff.visit_message",
];

export function isOperationalAlertType(type: NotificationEvent): boolean {
  return OPERATIONAL_ALERT_TYPES.includes(type);
}

export function notificationCategoryLabel(
  kind: NotificationVisualKind,
): string {
  switch (kind) {
    case "operational":
    case "messaging_staff":
      return "Operational";
    case "reminder":
      return "Reminder";
    case "proximity":
      return "Arrival";
    case "retention":
      return "Rebook";
    case "messaging":
      return "Message";
    default:
      return "Update";
  }
}

export type NotificationMetaChip = {
  key: string;
  label: string;
  emphasis?: boolean;
};

function formatChipWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact metadata chips for richer inbox rows. */
export function notificationMetaChips(
  record: NotificationRecord,
): NotificationMetaChip[] {
  const data = record.data;
  const chips: NotificationMetaChip[] = [];

  if (typeof data.service_name === "string" && data.service_name.trim()) {
    chips.push({ key: "service", label: data.service_name.trim() });
  }
  if (
    record.type.startsWith("staff.") &&
    typeof data.customer_name === "string" &&
    data.customer_name.trim()
  ) {
    chips.push({
      key: "customer",
      label: data.customer_name.trim(),
      emphasis: true,
    });
  } else if (
    typeof data.barber_name === "string" &&
    data.barber_name.trim()
  ) {
    chips.push({ key: "barber", label: data.barber_name.trim() });
  }

  const when = formatChipWhen(
    typeof data.starts_at === "string" ? data.starts_at : null,
  );
  if (when) {
    chips.push({ key: "when", label: when });
  }

  if (record.type === "appointment.reminder") {
    const kind =
      typeof data.reminder_kind === "string" ? data.reminder_kind : null;
    if (kind === "day_before") {
      chips.push({ key: "reminder", label: "Day before", emphasis: true });
    } else if (kind === "hour_before") {
      chips.push({ key: "reminder", label: "2 hours before", emphasis: true });
    }
  }

  if (record.type === "appointment.running_late") {
    const mins =
      typeof data.late_by_minutes === "number" && data.late_by_minutes > 0
        ? data.late_by_minutes
        : null;
    if (mins) {
      chips.push({
        key: "late",
        label: mins === 1 ? "~1 min late" : `~${mins} min late`,
        emphasis: true,
      });
    }
  }

  if (
    record.type === "appointment.arrival_nearby" ||
    record.type === "staff.arrival_nearby" ||
    record.type === "staff.arrival_checked_in"
  ) {
    const eta =
      typeof data.approximate_eta_minutes === "number" &&
      data.approximate_eta_minutes > 0
        ? data.approximate_eta_minutes
        : null;
    if (eta) {
      chips.push({
        key: "eta",
        label: eta === 1 ? "~1 min walk" : `~${eta} min walk`,
        emphasis: true,
      });
    }
  }

  if (isVisitThreadNotificationType(record.type)) {
    const preview =
      typeof data.message_preview === "string" && data.message_preview.trim()
        ? data.message_preview.trim()
        : null;
    if (preview) {
      chips.push({
        key: "preview",
        label: preview.length > 48 ? `${preview.slice(0, 47)}…` : preview,
      });
    }
  }

  return chips;
}

export function notificationThreadKey(
  record: NotificationRecord,
): string | null {
  const explicit = record.data.thread_group_key;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  const aid = record.data.appointment_id;
  if (typeof aid === "number" && aid > 0) {
    return `appointment:${aid}`;
  }
  return null;
}

export type NotificationInboxEntry =
  | { kind: "single"; record: NotificationRecord }
  | { kind: "thread"; threadKey: string; records: NotificationRecord[] };

/**
 * Within a day bucket, collapse multiple rows for the same visit/thread.
 */
export function groupNotificationsInDay(
  items: NotificationRecord[],
): NotificationInboxEntry[] {
  const byThread = new Map<string, NotificationRecord[]>();
  for (const row of items) {
    const key = notificationThreadKey(row);
    if (!key) continue;
    if (!byThread.has(key)) byThread.set(key, []);
    byThread.get(key)!.push(row);
  }

  const emitted = new Set<string>();
  const out: NotificationInboxEntry[] = [];

  for (const row of items) {
    const key = notificationThreadKey(row);
    if (!key) {
      out.push({ kind: "single", record: row });
      continue;
    }
    const batch = byThread.get(key)!;
    if (batch.length < 2) {
      out.push({ kind: "single", record: row });
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    out.push({
      kind: "thread",
      threadKey: key,
      records: [...batch].sort((a, b) => b.id - a.id),
    });
  }

  return out;
}

export type NotificationDayGroupWithEntries = NotificationDayGroup & {
  entries: NotificationInboxEntry[];
};

export function groupNotificationsForInbox(
  records: NotificationRecord[],
  nowMs: number = Date.now(),
): NotificationDayGroupWithEntries[] {
  return groupNotificationsByDay(records, nowMs).map((group) => ({
    ...group,
    entries: groupNotificationsInDay(group.items),
  }));
}

/** Operational and unread surface first within a page. */
export function sortNotificationsForDisplay(
  records: NotificationRecord[],
  options: { operationalFirst?: boolean } = {},
): NotificationRecord[] {
  const { operationalFirst = false } = options;
  return [...records].sort((a, b) => {
    if (operationalFirst) {
      const aOp = isOperationalAlertType(a.type) ? 1 : 0;
      const bOp = isOperationalAlertType(b.type) ? 1 : 0;
      if (aOp !== bOp) return bOp - aOp;
    }
    const aUnread = a.read_at === null ? 1 : 0;
    const bUnread = b.read_at === null ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bT - aT;
  });
}

export function toastDurationMs(record: NotificationRecord): number {
  if (
    record.data.urgency === "operational" ||
    isOperationalAlertType(record.type)
  ) {
    return 9_500;
  }
  if (record.type === "appointment.reminder") return 8_000;
  return 6_500;
}
