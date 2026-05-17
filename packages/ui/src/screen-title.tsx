import type { ReactNode } from "react";

import { cn } from "./lib/utils";

type ScreenTitleProps = {
  /** Omit on native app-shell routes (bottom tab bar carries wayfinding). */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
};

export function ScreenTitle({
  eyebrow,
  title,
  description,
  className,
}: ScreenTitleProps) {
  return (
    <header className={cn("motion-enter flex flex-col gap-4", className)}>
      {eyebrow ? (
        <p className="text-caption font-semibold uppercase tracking-widecaps text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-display font-semibold tracking-display text-foreground">
        {title}
      </h1>
      {description ? (
        <div className="max-w-2xl text-body-lg leading-body text-muted-foreground sm:text-body-lg">
          {description}
        </div>
      ) : null}
    </header>
  );
}
