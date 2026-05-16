import type { AppointmentThreadMessage } from "@ozilcuts/types";

export function formatVisitThreadTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function visitThreadSenderLabel(
  msg: AppointmentThreadMessage,
  viewerUserId: number,
): string {
  if (!msg.sender) return "Visit";
  if (msg.sender.id === viewerUserId) return "You";
  if (msg.sender.role === "barber") return "Barber";
  if (msg.sender.role === "customer") return "Guest";
  if (msg.sender.role === "admin") return "Shop admin";

  return "Staff";
}

/** Message from someone else not covered by viewer's last read watermark. */
export function isVisitThreadEntryUnreadForViewer(
  msg: AppointmentThreadMessage,
  viewerUserId: number,
  viewerLastReadMessageId: number | null,
): boolean {
  if (!msg.sender) return false;
  if (msg.sender.id === viewerUserId) return false;
  const watermark = viewerLastReadMessageId ?? 0;
  return msg.id > watermark;
}

export function visitThreadKindLabel(msg: AppointmentThreadMessage): string {
  if (msg.kind === "preset") return "Quick reply";
  if (msg.kind !== "operational") return "Note";
  const key = msg.operational_key ?? "";
  if (key.startsWith("arrival_auto_")) return "Arrival update";
  return "Operational";
}
