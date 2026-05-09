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
    <header className={cn("motion-enter flex flex-col gap-4", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-widecaps text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-[1.12] tracking-editorial text-foreground sm:text-[2.125rem] sm:leading-[1.1]">
        {title}
      </h1>
      {description ? (
        <div className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
          {description}
        </div>
      ) : null}
    </header>
  );
}
