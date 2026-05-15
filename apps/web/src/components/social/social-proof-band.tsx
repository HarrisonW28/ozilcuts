"use client";

import { publicReviewQuotes } from "@/lib/public-site-copy";
import { getSocialConfig, hasSocialPresence } from "@/lib/social-config";
import { cn } from "@ozilcuts/ui";
import { InstagramIcon } from "@/components/social/instagram-icon";
import { Quote } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type SocialProofBandProps = {
  className?: string;
};

/**
 * Combines editorial review copy with lightweight social stats — no widgets.
 */
export function SocialProofBand({ className }: SocialProofBandProps) {
  const config = useMemo(() => getSocialConfig(), []);
  const quote = publicReviewQuotes[0];
  const showSocial = hasSocialPresence(config);

  return (
    <aside
      className={cn("social-proof-band", className)}
      aria-labelledby="social-proof-heading"
    >
      <p
        id="social-proof-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Social proof
      </p>
      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center md:gap-10">
        <blockquote className="border-l-2 border-primary/35 pl-5 dark:border-primary/45">
          <Quote
            className="mb-3 size-5 text-primary/50"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-lg leading-relaxed text-foreground sm:text-xl">
            “{quote.quote}”
          </p>
          <footer className="mt-3 text-sm font-medium text-muted-foreground">
            {quote.cite}
          </footer>
        </blockquote>

        {showSocial ? (
          <dl className="grid grid-cols-2 gap-3 text-center sm:gap-4">
            <div className="rounded-xl border border-border/45 bg-card/70 px-4 py-5 shadow-xs dark:bg-card/45">
              <dt className="text-[10px] font-semibold uppercase tracking-widecaps text-muted-foreground">
                Community
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {config.proof.followersLabel}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">followers</dd>
            </div>
            <div className="rounded-xl border border-border/45 bg-card/70 px-4 py-5 shadow-xs dark:bg-card/45">
              <dt className="text-[10px] font-semibold uppercase tracking-widecaps text-muted-foreground">
                Drops
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {config.proof.postsLabel}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">posts</dd>
            </div>
            {config.instagramProfileUrl ? (
              <div className="col-span-2">
                <Link
                  href={config.instagramProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-background/40"
                >
                  <InstagramIcon className="size-4" />
                  See the work on Instagram
                </Link>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </aside>
  );
}
