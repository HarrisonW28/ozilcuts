"use client";

import { AccountSubnav } from "@/components/account-subnav";
import { PrivacyHub } from "@/components/privacy";
import { PageSessionSkeleton } from "@/components/loading";
import { useSessionProfile } from "@/lib/use-session-profile";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";

export default function ProfilePrivacyPage() {
  const { profile } = useSessionProfile();
  const isCustomer =
    profile.kind === "ready" && profile.user.role.slug === "customer";

  return (
    <main id="main-content" className="page-main app-shell-scroll flex-1">
      <div className="mx-auto w-full max-w-3xl page-stack">
        <div className="flex flex-col gap-6">
          <ScreenTitle
            className="gap-3"
            eyebrow={OZILCUTS_APP_NAME}
            title="Privacy & data"
            description="Consent, location, notifications, export, and account deletion — built for trust and compliance."
          />
          {profile.kind === "ready" ? (
            <AccountSubnav isCustomer={isCustomer} />
          ) : null}
        </div>

        {profile.kind === "loading" ? (
          <PageSessionSkeleton statusLabel="Loading account" />
        ) : null}

        {profile.kind === "none" ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                Sign in to manage your privacy settings.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {profile.kind === "ready" && !isCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle>Customer accounts only</CardTitle>
              <CardDescription>
                Privacy controls apply to guest accounts.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/">Home</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {isCustomer ? <PrivacyHub /> : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy policy
          </Link>
          {" · "}
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
