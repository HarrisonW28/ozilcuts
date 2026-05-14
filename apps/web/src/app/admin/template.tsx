"use client";

import type { ReactNode } from "react";

/**
 * Segment-level wrapper for subtle enter transitions (native app shell).
 */
export default function AdminShellTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="app-shell-route flex min-h-0 flex-1 flex-col">{children}</div>;
}
