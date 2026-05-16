import { ApiError } from "@ozilcuts/api";

type AbusePayload = {
  message?: string;
  code?: string;
};

/** HTTP 429 abuse block from the API (booking, messaging, registration). */
export function isAbuseBlockedError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 429) {
    return false;
  }
  const payload = error.payload as AbusePayload | undefined;
  return typeof payload?.code === "string" && payload.code.length > 0;
}

export function abuseBlockedMessage(error: unknown): string | null {
  if (!isAbuseBlockedError(error)) return null;
  if (error instanceof ApiError) {
    const payload = error.payload as AbusePayload | undefined;
    if (typeof payload?.message === "string" && payload.message.trim() !== "") {
      return payload.message;
    }
    return error.message;
  }
  return null;
}

export function abuseBlockedCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 429) return null;
  const payload = error.payload as AbusePayload | undefined;
  return typeof payload?.code === "string" ? payload.code : null;
}
