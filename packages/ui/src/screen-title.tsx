import type { ReactNode } from "react";

import { cn } from "./lib/utils";

type ScreenTitleProps = {
  eyebrow: string;
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
    <header className={cn("flex flex-col gap-3", className)}>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <div className="text-base leading-relaxed text-muted-foreground">
          {description}
        </div>
      ) : null}
    </header>
  );
}
