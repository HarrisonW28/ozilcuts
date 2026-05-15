"use client";

import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type BarberOperationalSectionProps = {
  id: string;
  title: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function BarberOperationalSection({
  id,
  title,
  badge,
  className,
  children,
}: BarberOperationalSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={id}
          className="brand-section-label"
        >
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}
