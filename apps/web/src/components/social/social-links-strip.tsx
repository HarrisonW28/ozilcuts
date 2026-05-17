"use client";

import {
  getSocialConfig,
  type SocialConfigOverrides,
  type SocialLink,
} from "@/lib/social-config";
import { cn } from "@ozilcuts/ui";
import { InstagramIcon } from "@/components/social/instagram-icon";
import { useMemo } from "react";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M16.5 3.5c.9 1.2 2.2 2.1 3.7 2.4v3.1c-1.3-.04-2.6-.5-3.7-1.3v7.8c0 3.4-2.7 6.2-6.1 6.2S4.3 18.9 4.3 15.5s2.7-6.2 6.1-6.2c.3 0 .6 0 .9.1v3.2c-.3-.1-.6-.1-.9-.1-1.6 0-3 1.4-3 3s1.4 3 3 3 3-1.4 3-3V3.5h2.9z" />
    </svg>
  );
}

function SocialIcon({ link }: { link: SocialLink }) {
  if (link.platform === "tiktok") {
    return <TikTokIcon className="size-4 shrink-0" />;
  }
  return <InstagramIcon className="size-4 shrink-0" />;
}

type SocialLinksStripProps = {
  className?: string;
  /** Compact pills for footers; default shows handle text on sm+. */
  variant?: "default" | "compact";
  socialOverrides?: SocialConfigOverrides;
};

export function SocialLinksStrip({
  className,
  variant = "default",
  socialOverrides,
}: SocialLinksStripProps) {
  const config = useMemo(() => getSocialConfig(socialOverrides), [socialOverrides]);
  if (config.links.length === 0) return null;

  return (
    <nav
      className={cn("social-links-strip", className)}
      aria-label="Social media"
    >
      {config.links.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link-pill touch-manipulation"
        >
          <SocialIcon link={link} />
          <span className={variant === "compact" ? "sr-only" : "truncate"}>
            {variant === "compact" ? link.label : `@${link.handle}`}
          </span>
          {variant === "compact" ? (
            <span className="sr-only"> (opens in new tab)</span>
          ) : (
            <span className="sr-only"> — opens in new tab</span>
          )}
        </a>
      ))}
    </nav>
  );
}
