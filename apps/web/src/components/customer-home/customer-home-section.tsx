"use client";

import { cn } from "@ozilcuts/ui";
import Link from "next/link";
import type { ReactNode } from "react";

type CustomerHomeSectionProps = {
  id: string;
  title: string;
  action?: { href: string; label: string };
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function CustomerHomeSection({
  id,
  title,
  action,
  badge,
  className,
  children,
}: CustomerHomeSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("space-y-3", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={id}
          className="brand-section-label"
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {badge}
          {action ? (
            <Link
              href={action.href}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {action.label}
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
