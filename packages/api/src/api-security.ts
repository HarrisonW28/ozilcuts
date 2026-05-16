import { ApiError } from "./auth";

/** Drop expired or revoked bearer sessions on the client. */
export function isApiUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
