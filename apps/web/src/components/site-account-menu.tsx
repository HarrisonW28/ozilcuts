"use client";

import {
  getAccountMenuGroups,
  type AccountMenuGroup,
} from "@/lib/site-primary-nav";
import { AccountMenuLinkInner } from "@/components/account-menu-link-inner";
import type { ProfileState } from "@/lib/use-session-profile";
import { Button, cn } from "@ozilcuts/ui";
import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type ReadyProfile = Extract<ProfileState, { kind: "ready" }>;

type SiteAccountMenuProps = {
  profile: ReadyProfile;
  onSignOut: () => void | Promise<void>;
  /** When true, render only the sliding panel sections (for mobile drawer). */
  listOnly?: boolean;
  menuGroups?: AccountMenuGroup[];
  onNavigate?: () => void;
};

export function SiteAccountMenu({
  profile,
  onSignOut,
  listOnly = false,
  menuGroups: menuGroupsProp,
  onNavigate,
}: SiteAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const menuGroups = menuGroupsProp ?? getAccountMenuGroups(profile);

  const close = useCallback(() => setOpen(false), []);
  const onLink = useCallback(() => {
    close();
    onNavigate?.();
  }, [close, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const panel = (
    <nav
      id={panelId}
      role="navigation"
      aria-label="Account menu"
      className={cn(
        !listOnly &&
          "absolute right-0 z-50 mt-2 w-[min(100vw-2rem,18rem)] rounded-xl border border-border/60 bg-popover p-2 text-popover-foreground shadow-lg motion-popover",
      )}
    >
      {menuGroups.map((group) => (
        <div
          key={group.id}
          className={cn("border-b border-border/40 py-2 last:border-b-0")}
        >
          {group.label ? (
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.links.map((link) => (
              <li key={`${group.id}-${link.href}`}>
                <Link
                  href={link.href}
                  className="flex items-center rounded-lg px-2 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={onLink}
                >
                  <AccountMenuLinkInner icon={link.icon} label={link.label} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="border-t border-border/50 px-1 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-10 w-full justify-start gap-2 px-2 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            close();
            void onSignOut();
          }}
        >
          <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
          Sign out
        </Button>
      </div>
    </nav>
  );

  if (listOnly) {
    return panel;
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        id={buttonId}
        type="button"
        variant="outline"
        size="sm"
        className="min-h-10 max-w-full gap-1.5 touch-manipulation px-2.5 sm:min-h-9"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hidden max-w-[12rem] truncate sm:inline">
          {profile.user.name}
        </span>
        <span className="sm:hidden">Account</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 opacity-70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>
      {open ? panel : null}
    </div>
  );
}
