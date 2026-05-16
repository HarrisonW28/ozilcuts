import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { ScreenTitle } from "@ozilcuts/ui";
import Link from "next/link";

export default function TermsPage() {
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
          title="Terms of service"
          description="The basics for using Ozilcuts to book and manage your visits."
        />
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            By creating an account or booking, you agree to use the service
            respectfully, arrive on time when possible, and follow studio policies
            communicated during your visit.
          </p>
          <p>
            Appointments may require deposits where shown. Cancellations and
            reschedules follow the rules presented at booking time.
          </p>
          <p>
            We may update these terms; continued use after changes constitutes
            acceptance. See also our{" "}
            <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
