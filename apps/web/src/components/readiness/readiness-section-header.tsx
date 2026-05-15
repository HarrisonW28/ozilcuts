"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ReadinessSectionHeaderProps = {
  icon: ReactNode;
  label: string;
  href: string;
  count?: number;
};

export function ReadinessSectionHeader({
  icon,
  label,
  href,
  count,
}: ReadinessSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex min-w-0 items-center gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-foreground/80" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
        {count != null && count > 0 ? (
          <span className="tabular-nums text-caption font-normal normal-case text-muted-foreground">
            ({count})
          </span>
        ) : null}
      </p>
      <Link
        href={href}
        className="min-h-10 shrink-0 content-center px-1 text-caption font-medium text-primary underline-offset-4 hover:underline"
      >
        Open
      </Link>
    </div>
  );
}
