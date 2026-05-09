"use client";

import { cn } from "@ozilcuts/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AccountSubnavProps = {
  isCustomer: boolean;
};

const pillClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-10";

export function AccountSubnav({ isCustomer }: AccountSubnavProps) {
  const pathname = usePathname();
  const items = [
    { href: "/profile" as const, label: "Account" },
    ...(isCustomer
      ? ([
          { href: "/profile/hair" as const, label: "Hair" },
          { href: "/profile/visits" as const, label: "Visits" },
        ] as const)
      : []),
    { href: "/profile/notifications" as const, label: "Alerts" },
  ];

  return (
    <nav
      aria-label="Account sections"
      className="-mx-1 flex flex-wrap gap-2 sm:max-w-none"
    >
      {items.map((item) => {
        const active =
          item.href === "/profile"
            ? pathname === "/profile"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              pillClass,
              active
                ? "border-primary/45 bg-primary/10 text-foreground shadow-sm dark:border-primary/35 dark:bg-primary/15"
                : "border-border/60 bg-background/85 text-muted-foreground hover:border-border hover:bg-muted/55 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
