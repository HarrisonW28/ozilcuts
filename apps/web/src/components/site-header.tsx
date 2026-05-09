"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { NotificationsToaster } from "@/components/notifications-toaster";
import { OperationalWorkspaceToggle } from "@/components/operational-workspace-toggle";
import { useOperationalWorkspaceMode } from "@/lib/operational-workspace-context";
import { getPrimaryNavSections } from "@/lib/site-primary-nav";
import type { ProfileState } from "@/lib/use-session-profile";
import { Button, buttonVariants, cn } from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ElementRef,
} from "react";

type SiteHeaderProps = {
  profile: ProfileState;
  onSignOut: () => void | Promise<void>;
};

const desktopNavLinkClass =
  "inline-flex min-h-11 items-center rounded-md px-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:bg-muted/60 hover:text-foreground hover:underline active:bg-muted/80 sm:min-h-0 sm:py-1.5";

const mobileNavLinkClass =
  "motion-interactive flex min-h-12 items-center rounded-xl border border-transparent px-3 text-base font-medium text-foreground transition-colors hover:border-border/60 hover:bg-muted/40 active:bg-muted/55";

export function SiteHeader({ profile, onSignOut }: SiteHeaderProps) {
  const { mode: workspaceMode } = useOperationalWorkspaceMode();
  const pathname = usePathname();
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<ElementRef<"nav">>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navSections = getPrimaryNavSections(profile, workspaceMode);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const first = mobilePanelRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    first?.focus();
  }, [mobileNavOpen]);

  const dismissMobileNav = useCallback((restoreFocus: boolean) => {
    setMobileNavOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 sm:gap-3 sm:px-6 sm:pt-6 sm:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
            >
              {OZILCUTS_APP_NAME}
            </Link>
            <nav
              aria-label="Primary"
              className="hidden flex-wrap items-center gap-x-1 gap-y-1 text-sm md:flex"
            >
              {navSections.flatMap((section) =>
                section.links.map((link) => (
                  <Link
                    key={`${section.id}-${link.href}`}
                    href={link.href}
                    className={desktopNavLinkClass}
                  >
                    {link.label}
                  </Link>
                )),
              )}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {profile.kind === "ready" &&
            (profile.user.role.slug === "barber" ||
              profile.user.role.slug === "admin") ? (
              <div className="hidden md:block">
                <OperationalWorkspaceToggle />
              </div>
            ) : null}
            <Button
              ref={menuButtonRef}
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls={menuId}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
              <span className="sr-only">
                {mobileNavOpen ? "Close main menu" : "Open main menu"}
              </span>
            </Button>
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
                  <NotificationsBell enabled />
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
          </div>
        </div>

        {mobileNavOpen ? (
          <nav
            ref={mobilePanelRef}
            id={menuId}
            className="motion-enter max-h-[min(70vh,calc(100dvh-6rem))] overflow-y-auto overscroll-contain border-t border-border/40 px-4 py-4 md:hidden"
            aria-label="Primary"
          >
            <ul className="space-y-5">
              {navSections.map((section) => (
                <li key={section.id}>
                  {section.label ? (
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </p>
                  ) : null}
                  <ul className="space-y-1">
                    {section.links.map((link) => (
                      <li key={`${section.id}-${link.href}`}>
                        <Link
                          href={link.href}
                          className={mobileNavLinkClass}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {profile.kind === "ready" &&
              (profile.user.role.slug === "barber" ||
                profile.user.role.slug === "admin") ? (
                <li>
                  <div className="mt-4 border-t border-border/45 pt-4 md:hidden">
                    <OperationalWorkspaceToggle compact />
                  </div>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </header>

      {mobileNavOpen ? (
        <button
          type="button"
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-background/55 backdrop-blur-[2px] dark:bg-background/65 md:hidden"
          aria-label="Dismiss menu"
          onClick={() => dismissMobileNav(true)}
        />
      ) : null}

      <NotificationsToaster />
    </>
  );
}
