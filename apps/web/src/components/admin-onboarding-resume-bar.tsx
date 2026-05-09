"use client";

import type { ProfileState } from "@/lib/use-session-profile";
import { buttonVariants, cn } from "@ozilcuts/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminOnboardingResumeBarProps = {
  profile: ProfileState;
};

/**
 * Second row under the main header when a shop admin is mid–onboarding.
 */
export function AdminOnboardingResumeBar({ profile }: AdminOnboardingResumeBarProps) {
  const pathname = usePathname();

  if (pathname === "/admin/onboarding" || pathname.startsWith("/admin/onboarding/")) {
    return null;
  }

  if (profile.kind !== "ready" || profile.user.role.slug !== "admin") {
    return null;
  }

  const sa = profile.user.shop_admin;
  if (!sa || sa.onboarding_completed_at) {
    return null;
  }

  const step = sa.onboarding_step;
  const stepLabel =
    step >= 1 && step <= 6
      ? [
          "Shop details",
          "Add barbers",
          "Business hours",
          "Add services",
          "Payments",
          "Go live",
        ][step - 1]
      : "Shop setup";

  return (
    <div
      role="region"
      aria-label="Shop setup in progress"
      className="border-t border-primary/20 bg-primary/10 px-4 py-2.5 dark:border-primary/25 dark:bg-primary/15"
    >
      <p className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 text-center text-sm sm:flex-row sm:flex-wrap sm:gap-x-3">
        <span className="font-medium leading-snug text-foreground">
          Shop setup in progress
        </span>
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <span className="text-[11px] font-semibold uppercase tracking-widecaps">
          <span className="text-muted-foreground">
            Step {Math.min(Math.max(step, 1), 6)}
            {": "}
          </span>
          <span className="text-primary">{stepLabel}</span>
        </span>
        <Link
          href="/admin/onboarding"
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "min-h-9 w-full sm:w-auto",
          )}
        >
          Resume guided setup
        </Link>
      </p>
    </div>
  );
}
