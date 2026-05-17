"use client";

import { PublicHomeView } from "@/components/public-home-view";
import { SiteHeader } from "@/components/site-header";
import {
  ozilcutsPageEnterInitial,
  ozilcutsPageEnterTransition,
} from "@/lib/motion";
import { useSessionProfile } from "@/lib/use-session-profile";
import { resolveHomeVideoSources } from "@/lib/home-video-config";
import {
  HEALTH_COPY,
  homeSignedInGreeting,
} from "@/lib/user-facing-copy";
import { fetchApiHealth, fetchBarbers, fetchPublicHomeMarketing, fetchServices } from "@ozilcuts/api";
import type { PublicHomeMarketing } from "@ozilcuts/types";
import type { BarberProfilePublic, ServiceSummary } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

type CatalogPreviewState =
  | { kind: "loading" }
  | { kind: "ok"; services: ServiceSummary[]; barbers: BarberProfilePublic[] };

const PREVIEW_COUNT = 3;

export default function Home() {
  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });
  const [catalogPreview, setCatalogPreview] = useState<CatalogPreviewState>({
    kind: "loading",
  });
  const [homeMarketing, setHomeMarketing] = useState<PublicHomeMarketing | null>(
    null,
  );

  const fetchHealthOnce = useCallback((isCancelled: () => boolean) => {
    setHealth({ kind: "loading" });
    fetchApiHealth()
      .then(() => {
        if (isCancelled()) return;
        setHealth({ kind: "ok" });
      })
      .catch((err: unknown) => {
        if (isCancelled()) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setHealth({ kind: "error", message });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchHealthOnce(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchHealthOnce]);

  const retryHealth = useCallback(() => {
    fetchHealthOnce(() => false);
  }, [fetchHealthOnce]);

  useEffect(() => {
    let cancelled = false;
    setCatalogPreview({ kind: "loading" });
    Promise.allSettled([fetchServices(), fetchBarbers()]).then((results) => {
      if (cancelled) return;
      const services =
        results[0].status === "fulfilled" ? results[0].value : [];
      const barbers =
        results[1].status === "fulfilled" ? results[1].value : [];
      setCatalogPreview({
        kind: "ok",
        services: services.slice(0, PREVIEW_COUNT),
        barbers: barbers.slice(0, PREVIEW_COUNT),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicHomeMarketing()
      .then((data) => {
        if (!cancelled) setHomeMarketing(data);
      })
      .catch(() => {
        if (!cancelled) setHomeMarketing(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const motionInitial = ozilcutsPageEnterInitial(reduceMotion);

  const profilePending = profile.kind === "loading";

  const heroTitle =
    profile.kind === "ready"
      ? `Welcome back, ${profile.user.name.split(" ")[0] ?? profile.user.name}`
      : "Sharp cuts. Quiet confidence.";

  const heroDescription =
    profile.kind === "ready" ? (
      <p className="text-foreground/90">
        {homeSignedInGreeting(profile.user.role.slug)}
      </p>
    ) : (
      <>Professional cuts. One calm place to book.</>
    );

  const healthLine =
    health.kind === "loading" || health.kind === "idle"
      ? HEALTH_COPY.checking
      : health.kind === "error"
        ? HEALTH_COPY.offline
        : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main id="main-content" className="page-main page-main--home">
        <motion.div
          initial={motionInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={ozilcutsPageEnterTransition}
          className="w-full"
        >
          <PublicHomeView
            heroTitle={heroTitle}
            heroDescription={heroDescription}
            profileGuest={profile.kind === "none"}
            profilePending={profilePending}
            profileReady={profile.kind === "ready"}
            videoSources={resolveHomeVideoSources(homeMarketing)}
            instagramHandle={homeMarketing?.instagram_handle ?? null}
            servicesPreview={
              catalogPreview.kind === "ok" ? catalogPreview.services : []
            }
            barbersPreview={
              catalogPreview.kind === "ok" ? catalogPreview.barbers : []
            }
            previewsLoading={catalogPreview.kind === "loading"}
            health={{
              line: healthLine ? (
                <span className="text-muted-foreground">{healthLine}</span>
              ) : null,
              showRetry: health.kind === "error",
              onRetry: retryHealth,
            }}
          />
        </motion.div>
      </main>
    </div>
  );
}
