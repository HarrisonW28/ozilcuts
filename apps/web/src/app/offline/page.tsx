import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  ScreenTitle,
  buttonVariants,
  cn,
} from "@ozilcuts/ui";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Fallback page rendered by the service worker when a navigation
 * happens with no network. Kept dependency-free (no client hooks, no
 * API calls) so it works even when the runtime is fully offline.
 */
export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="page-main-hero min-h-dvh"
    >
      <div className="motion-enter w-full max-w-md sm:max-w-lg">
        <Card>
          <CardHeader>
            <ScreenTitle
              eyebrow="Ozil Cuts"
              title="You're offline"
              description={
                <>
                  No connection right now. We can&rsquo;t load fresh data
                  until you&rsquo;re back online — your bookings and updates
                  will sync as soon as the connection returns.
                </>
              }
            />
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
              <li>Your saved appointments are unaffected.</li>
              <li>New bookings need a connection to confirm.</li>
              <li>Try again once you&rsquo;re back online.</li>
            </ul>
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/25 pt-4">
            <Link
              href="/"
              className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
            >
              Try home page
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
