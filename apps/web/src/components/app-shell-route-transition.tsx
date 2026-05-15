import type { ReactNode } from "react";

/** Segment template: subtle enter transition for native shell navigations. */
export function AppShellRouteTransition({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell-route flex min-h-0 flex-1 flex-col">{children}</div>
  );
}
