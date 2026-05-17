import type { LaravelValidationPayload } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

/** Resolves upload URL; fails fast when production has no API host configured. */
export function marketingUploadUrl(apiPath: string): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const configured =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
      : "";

  if (configured) {
    return `${configured}${path}`;
  }

  if (typeof window !== "undefined") {
    if (process.env.NODE_ENV === "development") {
      return path;
    }
    throw new ApiError(
      "Set NEXT_PUBLIC_API_URL to your Laravel API host so uploads reach the server.",
      0,
      null,
    );
  }

  return `${getApiBaseUrl()}${path}`;
}

export async function readMarketingUploadError(res: Response): Promise<string> {
  if (res.status === 413) {
    return "File is too large for the server. Use a smaller file or raise PHP upload_max_filesize on the API host.";
  }

  const payload = (await res.json().catch(() => null)) as
    | (LaravelValidationPayload & { message?: string })
    | null;

  if (payload && typeof payload === "object") {
    const errs = payload.errors;
    if (errs) {
      const firstKey = Object.keys(errs)[0];
      const first = firstKey ? errs[firstKey]?.[0] : undefined;
      if (first) return first;
    }
    if (typeof payload.message === "string" && payload.message.trim() !== "") {
      return payload.message;
    }
  }

  if (
    res.status === 429 ||
    (res.status === 422 &&
      typeof payload?.message === "string" &&
      /too many attempts/i.test(payload.message))
  ) {
    return "Too many upload attempts. Wait a minute, then try again.";
  }

  if (res.status === 401) {
    return "Session expired. Sign in again, then retry the upload.";
  }
  if (res.status === 403) {
    return "Admin access is required for this upload.";
  }
  if (res.status === 404) {
    return "Upload endpoint not found. Check NEXT_PUBLIC_API_URL points at your Laravel API.";
  }
  if (res.status >= 500) {
    return "Server error during upload. Check API logs, storage permissions, and PHP upload limits.";
  }

  return "Upload failed. Try again.";
}

export async function assertMarketingUploadOk(res: Response): Promise<void> {
  if (res.ok) return;
  const message = await readMarketingUploadError(res);
  throw new ApiError(message, res.status, null);
}
