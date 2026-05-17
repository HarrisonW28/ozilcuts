import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "motion-interactive group/button inline-flex shrink-0 touch-manipulation items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-semibold tracking-tight whitespace-nowrap outline-none select-none transition-[color,background-color,border-color,box-shadow,transform,opacity] focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 dark:focus-visible:ring-offset-background dark:aria-invalid:ring-destructive/35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm [a]:hover:bg-primary/88 hover:shadow-md",
        outline:
          "border-border/80 bg-background/90 text-foreground shadow-xs hover:border-border hover:bg-muted/80 aria-expanded:border-border aria-expanded:bg-muted dark:border-input/80 dark:bg-background/50 dark:hover:bg-muted/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/88 aria-expanded:bg-secondary",
        ghost:
          "shadow-none hover:bg-muted/90 hover:text-foreground aria-expanded:bg-muted/90 dark:hover:bg-muted/40",
        destructive:
          "bg-destructive/12 text-destructive shadow-xs hover:bg-destructive/18 dark:bg-destructive/18 dark:hover:bg-destructive/26",
        link: "h-auto !min-h-0 justify-start px-0.5 py-2 font-semibold text-primary shadow-none underline-offset-[0.2em] hover:underline sm:py-1.5",
      },
      size: {
        default:
          "min-h-11 gap-2 rounded-md px-4 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 sm:h-9 sm:min-h-9 sm:gap-2 sm:px-3.5 sm:text-sm sm:has-data-[icon=inline-end]:pr-2.5 sm:has-data-[icon=inline-start]:pl-2.5",
        xs: "min-h-10 gap-1 rounded-md px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 sm:h-6 sm:min-h-6 sm:px-2 sm:has-data-[icon=inline-end]:pr-1.5 sm:has-data-[icon=inline-start]:pl-1.5 sm:font-semibold [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-10 gap-1 rounded-md px-3 text-sm in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 sm:h-7 sm:min-h-7 sm:px-2.5 sm:text-[0.8125rem] sm:has-data-[icon=inline-end]:pr-1.5 sm:has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-2 rounded-md px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 sm:h-9 sm:min-h-9 sm:gap-2 sm:px-4 sm:text-sm sm:has-data-[icon=inline-end]:pr-3 sm:has-data-[icon=inline-start]:pl-3",
        icon: "size-11 rounded-md sm:size-8",
        "icon-xs":
          "size-10 rounded-md in-data-[slot=button-group]:rounded-md sm:size-6 [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 rounded-md in-data-[slot=button-group]:rounded-md sm:size-7",
        "icon-lg": "size-12 rounded-md sm:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Merge styles onto a child element (e.g. `next/link`). */
    asChild?: boolean;
    /**
     * Async in-flight state: disables the control, sets `aria-busy`, and shows
     * a compact spinner (skipped for `asChild` — use a plain child instead).
     */
    pending?: boolean;
  };

function ButtonPendingSpinner() {
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-85 motion-reduce:animate-none motion-reduce:border-dashed motion-reduce:opacity-75"
    />
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      pending = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));
    const mergedDisabled = Boolean(disabled || pending);

    if (asChild) {
      return (
        <Slot
          data-slot="button"
          className={classes}
          aria-busy={pending ? true : undefined}
          {...(props as ComponentPropsWithoutRef<typeof Slot>)}
        />
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        data-slot="button"
        className={classes}
        disabled={mergedDisabled}
        aria-busy={pending ? true : undefined}
        {...props}
      >
        {pending ? (
          <>
            <ButtonPendingSpinner />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
