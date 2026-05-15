import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/utils";

/**
 * Consistent icon hit-area and sizing for Lucide (or any SVG) children.
 */
const iconShellVariants = cva(
  "inline-flex shrink-0 items-center justify-center [&>svg]:shrink-0 [&>svg]:stroke-[1.75]",
  {
    variants: {
      size: {
        sm: "size-8 [&>svg]:size-[var(--icon-size-sm,0.875rem)]",
        md: "size-9 [&>svg]:size-[var(--icon-size-md,1rem)] sm:size-10 sm:[&>svg]:size-[var(--icon-size-lg,1.25rem)]",
        lg: "size-11 [&>svg]:size-[var(--icon-size-lg,1.25rem)]",
        xl: "size-12 [&>svg]:size-[var(--icon-size-xl,1.5rem)]",
      },
      tone: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        primary: "text-primary",
        "on-primary": "text-primary-foreground",
      },
      variant: {
        plain: "rounded-md",
        soft: "rounded-xl bg-muted/70 text-foreground dark:bg-muted/50",
        ring: "rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:ring-primary/25",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "default",
      variant: "plain",
    },
  },
);

type IconShellProps = Omit<ComponentPropsWithoutRef<"span">, "children"> &
  VariantProps<typeof iconShellVariants> & {
    children: ReactNode;
  };

function IconShell({
  className,
  size,
  tone,
  variant,
  children,
  ...props
}: IconShellProps) {
  return (
    <span
      data-slot="icon-shell"
      className={cn(iconShellVariants({ size, tone, variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { IconShell, iconShellVariants };
export type { IconShellProps };
