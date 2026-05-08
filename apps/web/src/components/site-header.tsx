"use client";

import { ModeToggle } from "@/components/mode-toggle";
import type { ProfileState } from "@/lib/use-session-profile";
import { Button, buttonVariants, cn } from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import Link from "next/link";

type SiteHeaderProps = {
  profile: ProfileState;
  onSignOut: () => void | Promise<void>;
};

export function SiteHeader({ profile, onSignOut }: SiteHeaderProps) {
  return (
    <header className="flex w-full flex-wrap items-center justify-end gap-2 border-b border-border/50 px-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:gap-3 sm:px-6 sm:pt-6">
      <div className="mr-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {OZILCUTS_APP_NAME}
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          <Link
            href="/services"
            className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
          >
            Services
          </Link>
          <Link
            href="/barbers"
            className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
          >
            Barbers
          </Link>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
          >
            Book
          </Link>
          {profile.kind === "ready" ? (
            <>
              {profile.user.role.slug === "customer" ? (
                <>
                  <Link
                    href="/profile"
                    className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/profile/hair"
                    className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
                  >
                    Hair
                  </Link>
                </>
              ) : null}
              <Link
                href="/appointments"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                My appointments
              </Link>
            </>
          ) : null}
          {profile.kind === "ready" && profile.user.role.slug === "barber" ? (
            <>
              <Link
                href="/barber/calendar"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                Calendar
              </Link>
              <Link
                href="/barber/hours"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                Hours
              </Link>
            </>
          ) : null}
          {profile.kind === "ready" && profile.user.role.slug === "admin" ? (
            <>
              <Link
                href="/admin/services"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                Catalog
              </Link>
              <Link
                href="/admin/barbers"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                Admin
              </Link>
              <Link
                href="/admin/reports/revenue"
                className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5"
              >
                Revenue
              </Link>
            </>
          ) : null}
        </nav>
      </div>
      <nav
        className="flex flex-wrap items-center gap-2 text-sm sm:gap-3"
        aria-label="Account"
      >
        {profile.kind === "none" ? (
          <>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "px-2",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Register
            </Link>
          </>
        ) : null}
        {profile.kind === "loading" ? (
          <span
            className="text-muted-foreground"
            aria-live="polite"
            aria-busy="true"
          >
            Loading account…
          </span>
        ) : null}
        {profile.kind === "error" ? (
          <>
            <span className="text-destructive" role="status">
              Session issue
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onSignOut()}
            >
              Sign out
            </Button>
          </>
        ) : null}
        {profile.kind === "ready" ? (
          <>
            <span className="max-w-[9rem] truncate font-medium text-foreground sm:hidden">
              {profile.user.name.split(" ")[0] ?? profile.user.name}
            </span>
            <div className="hidden text-end sm:block">
              <div className="max-w-[14rem] truncate text-sm font-medium text-foreground">
                {profile.user.name}
              </div>
              <div className="text-xs capitalize text-muted-foreground">
                {profile.user.role.slug}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onSignOut()}
              aria-label="Sign out of Ozilcuts"
            >
              Sign out
            </Button>
          </>
        ) : null}
      </nav>
      <ModeToggle />
    </header>
  );
}
