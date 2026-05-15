import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/utils";

const galleryTileVariants = cva(
  [
    "group/gallery-tile relative w-full overflow-hidden rounded-2xl bg-muted/25 text-left ring-1 ring-border/45 outline-none",
    "transition-[box-shadow,transform,border-color] motion-safe:duration-[var(--motion-duration-base)] motion-safe:ease-[var(--motion-ease-standard)]",
    "hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "dark:bg-muted/15 dark:ring-border/40",
    "motion-safe:active:scale-[0.995]",
  ].join(" "),
  {
    variants: {
      padding: {
        none: "",
        caption: "pb-0",
      },
    },
    defaultVariants: {
      padding: "none",
    },
  },
);

type GalleryTileProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof galleryTileVariants> & {
    asChild?: boolean;
  };

function GalleryTile({
  className,
  padding,
  asChild,
  type = "button",
  ...props
}: GalleryTileProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="gallery-tile"
      type={asChild ? undefined : type}
      className={cn(galleryTileVariants({ padding }), className)}
      {...props}
    />
  );
}

export { GalleryTile, galleryTileVariants };
export type { GalleryTileProps };
