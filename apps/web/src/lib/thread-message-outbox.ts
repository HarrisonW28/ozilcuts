import { postAppointmentThreadMessage } from "@ozilcuts/api";

const STORAGE_KEY = "ozilcuts_thread_outbox_v1";
const MAX_ITEMS = 24;

export const THREAD_OUTBOX_FLUSH_EVENT = "ozilcuts-thread-outbox-flush";

export type ThreadOutboxPayload =
  | { kind: "note"; body: string }
  | { kind: "operational"; operational_key: string }
  | { kind: "preset"; preset_key: string };

export type ThreadOutboxItem = {
  id: string;
  appointmentId: number;
  payload: ThreadOutboxPayload;
  createdAt: number;
};

function loadAll(): ThreadOutboxItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ThreadOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: ThreadOutboxItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function enqueueThreadOutboxItem(
  appointmentId: number,
  payload: ThreadOutboxPayload,
): ThreadOutboxItem {
  const item: ThreadOutboxItem = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `q_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    appointmentId,
    payload,
    createdAt: Date.now(),
  };
  const next = [...loadAll(), item];
  saveAll(next.slice(-MAX_ITEMS));
  return item;
}

export function countThreadOutboxForAppointment(appointmentId: number): number {
  return loadAll().filter((x) => x.appointmentId === appointmentId).length;
}

export async function flushThreadOutbox(token: string): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;

  let sent = 0;
  while (true) {
    const all = loadAll();
    if (all.length === 0) break;
    const next = all[0];
    const body =
      next.payload.kind === "note"
        ? { kind: "note" as const, body: next.payload.body }
        : next.payload.kind === "operational"
          ? {
              kind: "operational" as const,
              operational_key: next.payload.operational_key,
            }
          : { kind: "preset" as const, preset_key: next.payload.preset_key };

    try {
      await postAppointmentThreadMessage(token, next.appointmentId, body);
      saveAll(all.slice(1));
      sent += 1;
    } catch {
      break;
    }
  }

  if (sent > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THREAD_OUTBOX_FLUSH_EVENT, { detail: { sent } }),
    );
  }

  return sent;
}
