import type { AppointmentThreadPayload } from "@ozilcuts/types";

const KEY_PREFIX = "ozilcuts_thread_snap_v1";

type Snapshot = {
  savedAt: number;
  payload: AppointmentThreadPayload;
};

export function writeVisitThreadSnapshot(
  appointmentId: number,
  payload: AppointmentThreadPayload,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const snap: Snapshot = { savedAt: Date.now(), payload };
    sessionStorage.setItem(`${KEY_PREFIX}:${appointmentId}`, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function readVisitThreadSnapshot(
  appointmentId: number,
): { savedAt: number; payload: AppointmentThreadPayload } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}:${appointmentId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed?.payload?.messages || !parsed.payload.meta) return null;
    return { savedAt: parsed.savedAt, payload: parsed.payload };
  } catch {
    return null;
  }
}
