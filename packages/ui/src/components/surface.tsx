import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { uiMotionTransition } from "../lib/motion-classes";
import { cn } from "../lib/utils";

const surfaceVariants = cva(
  `rounded-xl border transition-[border-color,box-shadow,background-color] ${uiMotionTransition}`,
  {
    variants: {
      elevation: {
        flat: "border-transparent bg-transparent shadow-none",
        quiet:
          "border-border/55 bg-card/80 shadow-none dark:border-border/50 dark:bg-card/90",
        raised:
          "border-border/60 bg-card shadow-sm dark:border-border/45 dark:shadow-md",
        floating:
          "border-border/50 bg-card shadow-md dark:border-border/40 dark:shadow-lg",
        sunken:
          "border-border/40 bg-muted/60 shadow-[inset_0_1px_2px_oklch(0_0_0/0.06)] dark:bg-muted/50 dark:shadow-[inset_0_1px_2px_oklch(0_0_0/0.25)]",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4 sm:p-5",
        lg: "p-5 sm:p-6",
      },
    },
    defaultVariants: {
      elevation: "raised",
      padding: "none",
    },
  },
);

type SurfaceProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof surfaceVariants>;

function Surface({
  className,
  elevation,
  padding,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      className={cn(surfaceVariants({ elevation, padding }), className)}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
export type { SurfaceProps };
