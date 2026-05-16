"use client";

import {
  ADMIN_SHELL_ITEMS,
  BARBER_SHELL_ITEMS,
  CUSTOMER_SHELL_ITEMS,
} from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EXTRA_BY_ROLE: Record<string, string[]> = {
  customer: ["/notifications", "/profile/privacy"],
  barber: [],
  admin: [],
};

/**
 * Warms the client cache for primary shell routes after auth resolves so tab
 * switches feel instant (pairs with Next.js Link prefetch).
 */
export function AppShellRoutePrefetch() {
  const { profile } = useSessionProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile.kind !== "ready") return;

    const slug = profile.user.role.slug;
    const items =
      slug === "customer"
        ? CUSTOMER_SHELL_ITEMS
        : slug === "barber"
          ? BARBER_SHELL_ITEMS
          : slug === "admin"
            ? ADMIN_SHELL_ITEMS
            : null;
    if (!items) return;

    const paths = [
      ...items.map((i) => i.href),
      ...(EXTRA_BY_ROLE[slug] ?? []),
    ];

    const run = () => {
      for (const p of paths) {
        try {
          router.prefetch(p);
        } catch {
          /* older Safari / restricted contexts */
        }
      }
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2200 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 350);
    return () => window.clearTimeout(t);
  }, [profile, router]);

  return null;
}
