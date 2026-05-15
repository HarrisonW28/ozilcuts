"use client";

import { useInbox } from "@/lib/use-inbox";
import { Button, cn } from "@ozilcuts/ui";
import { Bell, CalendarDays, ClipboardList } from "lucide-react";
import Link from "next/link";

type BarberOperationalDockProps = {
  className?: string;
};

/** One-thumb shortcuts to chair, list, and inbox. */
export function BarberOperationalDock({ className }: BarberOperationalDockProps) {
  const inbox = useInbox();

  return (
    <nav
      aria-label="Quick operations"
      className={cn(
        "grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3",
        className,
      )}
    >
      <Button
        asChild
        size="lg"
        className="h-auto min-h-[4rem] flex-col gap-1.5 py-3 touch-manipulation"
      >
        <Link href="/barber/calendar">
          <CalendarDays className="size-5" aria-hidden />
          <span className="text-xs font-semibold">Chair</span>
        </Link>
      </Button>
      <Button
        asChild
        size="lg"
        variant="secondary"
        className="h-auto min-h-[4rem] flex-col gap-1.5 py-3 touch-manipulation"
      >
        <Link href="/appointments">
          <ClipboardList className="size-5" aria-hidden />
          <span className="text-xs font-semibold">List</span>
        </Link>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="relative h-auto min-h-[4rem] flex-col gap-1.5 py-3 touch-manipulation"
      >
        <Link href="/notifications">
          <Bell className="size-5" aria-hidden />
          <span className="text-xs font-semibold">Inbox</span>
          {inbox.unread > 0 ? (
            <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {inbox.unread > 9 ? "9+" : inbox.unread}
            </span>
          ) : null}
        </Link>
      </Button>
    </nav>
  );
}
