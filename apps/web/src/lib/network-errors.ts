import { ApiError } from "@ozilcuts/api";

/** Best-effort: browser offline flag (may lie on captive portals). */
export function browserLooksOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function messageLooksLikeTimeout(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("could not reach the server in time") ||
    m.includes("abort")
  );
}

/**
 * Transport-level failures where retry / offline surfaces usually help.
 * Does not treat 4xx/5xx API responses as unreachable except timeout-shaped ApiError.
 */
export function isLikelyUnreachableNetwork(error: unknown): boolean {
  if (browserLooksOffline()) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof ApiError) {
    if (error.status === 0 && messageLooksLikeTimeout(error.message)) return true;
    if (messageLooksLikeTimeout(error.message)) return true;
  }
  if (error instanceof Error && messageLooksLikeTimeout(error.message)) return true;
  return false;
}
