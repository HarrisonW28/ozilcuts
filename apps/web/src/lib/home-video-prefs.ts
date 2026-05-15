/**
 * Network and accessibility gates for homepage video.
 */

export function readNavigatorSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return Boolean(conn?.saveData);
}

export function readSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string };
    }
  ).connection;
  const type = conn?.effectiveType;
  return type === "slow-2g" || type === "2g";
}

export function shouldDeferHomeVideo(): boolean {
  return readNavigatorSaveData() || readSlowConnection();
}
