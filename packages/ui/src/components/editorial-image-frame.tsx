import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/utils";

const editorialImageFrameVariants = cva(
  "relative w-full overflow-hidden rounded-2xl bg-muted/25 ring-1 ring-border/45 dark:bg-muted/15 dark:ring-border/40",
  {
    variants: {
      ratio: {
        auto: "",
        square: "aspect-square",
        portrait: "aspect-[4/5]",
        landscape: "aspect-[3/2]",
        cinema: "aspect-[21/9]",
      },
      tone: {
        default: "",
        elevated:
          "shadow-sm ring-border/55 dark:shadow-md dark:ring-border/50",
      },
    },
    defaultVariants: {
      ratio: "portrait",
      tone: "default",
    },
  },
);

type EditorialImageFrameProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof editorialImageFrameVariants> & {
    children: ReactNode;
    /** Shown when frame has no visible caption elsewhere (e.g. decorative strip). */
    label?: string;
  };

function EditorialImageFrame({
  className,
  ratio,
  tone,
  children,
  label,
  ...props
}: EditorialImageFrameProps) {
  return (
    <div
      data-slot="editorial-image-frame"
      className={cn(editorialImageFrameVariants({ ratio, tone }), className)}
      {...props}
    >
      {label ? (
        <span className="sr-only">{label}</span>
      ) : null}
      {children}
    </div>
  );
}

export { EditorialImageFrame, editorialImageFrameVariants };
export type { EditorialImageFrameProps };
