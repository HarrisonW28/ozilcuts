export type OperationalWorkspaceMode = "focused" | "full";

export const OPERATIONAL_WORKSPACE_STORAGE_KEY =
  "ozilcuts_operational_workspace" as const;

export function normalizeOperationalWorkspaceMode(
  raw: string | null,
): OperationalWorkspaceMode {
  return raw === "full" ? "full" : "focused";
}

export function readOperationalWorkspaceMode(): OperationalWorkspaceMode {
  if (typeof window === "undefined") return "focused";
  return normalizeOperationalWorkspaceMode(
    window.localStorage.getItem(OPERATIONAL_WORKSPACE_STORAGE_KEY),
  );
}

export function writeOperationalWorkspaceMode(
  mode: OperationalWorkspaceMode,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPERATIONAL_WORKSPACE_STORAGE_KEY, mode);
}
