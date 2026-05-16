import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { ScreenTitle } from "@ozilcuts/ui";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main id="main-content" className="page-main app-shell-scroll flex-1">
      <article className="mx-auto w-full max-w-2xl page-stack">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
        <ScreenTitle
          eyebrow={OZILCUTS_APP_NAME}
          title="Privacy policy"
          description="How Ozilcuts handles your data when you book, check in, and visit the studio."
        />
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">What we collect</h2>
          <p>
            Account details (name, email), booking history, optional hair profile
            and preferences, and notification choices. With your opt-in, coarse
            location pings during an active check-in window only.
          </p>
          <h2 className="text-base font-semibold text-foreground">How we use it</h2>
          <p>
            To run appointments, send confirmations and reminders you enable,
            improve studio operations, and — only if you consent — marketing or
            retention nudges.
          </p>
          <h2 className="text-base font-semibold text-foreground">Your rights</h2>
          <p>
            Signed-in customers can export data, update privacy controls, and
            delete their account from{" "}
            <Link href="/profile/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy &amp; data
            </Link>
            .
          </p>
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about privacy? Reach the studio through your usual booking
            contact channels.
          </p>
        </section>
      </article>
    </main>
  );
}
