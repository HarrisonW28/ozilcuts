"use client";

import { CustomerHomeGallery } from "@/components/customer-home/customer-home-gallery";
import { CustomerHomeLoyalty } from "@/components/customer-home/customer-home-loyalty";
import { CustomerHomeNotifications } from "@/components/customer-home/customer-home-notifications";
import { CustomerHomeShortcuts } from "@/components/customer-home/customer-home-shortcuts";
import { CustomerHomeUpcoming } from "@/components/customer-home/customer-home-upcoming";
import { CustomerHomeSkeleton } from "@/components/loading";
import {
  buildFavouriteBarberBookHref,
} from "@/lib/booking-url";
import { readRememberedBooking } from "@/lib/booking-remembered-preferences";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  milestoneProgress,
  pickNextUpcoming,
} from "@/lib/customer-home";
import { useInbox } from "@/lib/use-inbox";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchCustomerProfile,
  fetchHairProfile,
  fetchMyAppointments,
  fetchMyVisitsSummary,
  fetchNextVisitSuggestion,
} from "@ozilcuts/api";
import type {
  AppointmentRecord,
  CustomerAnalyticsResponse,
  CustomerProfile,
  HairProfile,
  RebookSuggestion,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type HomePayload = {
  appointments: AppointmentRecord[];
  visits: CustomerAnalyticsResponse | null;
  nextVisit: RebookSuggestion | null;
  customerProfile: CustomerProfile | null;
  hairProfile: HairProfile | null;
};

export function CustomerHomeDashboard() {
  const { profile } = useSessionProfile();
  const inbox = useInbox();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; data: HomePayload }
  >({ kind: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in to see your home." });
      return;
    }

    setState((prev) => {
      if (prev.kind === "ok") return prev;
      return { kind: "loading" };
    });
    setIsRefreshing(true);

    const [
      apptRes,
      visitsRes,
      nextRes,
      profileRes,
      hairRes,
    ] = await Promise.allSettled([
      fetchMyAppointments(token, {
        range: "upcoming",
        status: "all",
        perPage: 15,
      }),
      fetchMyVisitsSummary(token),
      fetchNextVisitSuggestion(token),
      fetchCustomerProfile(token),
      fetchHairProfile(token),
    ]);

    const appointments =
      apptRes.status === "fulfilled" ? apptRes.value.data : [];
    const visits = visitsRes.status === "fulfilled" ? visitsRes.value : null;
    const nextVisit =
      nextRes.status === "fulfilled" ? nextRes.value : null;
    const customerProfile =
      profileRes.status === "fulfilled" ? profileRes.value : null;
    const hairProfile =
      hairRes.status === "fulfilled" ? hairRes.value : null;

    const allRejected =
      apptRes.status === "rejected" &&
      visitsRes.status === "rejected" &&
      nextRes.status === "rejected" &&
      profileRes.status === "rejected" &&
      hairRes.status === "rejected";

    setIsRefreshing(false);

    if (allRejected) {
      const msg =
        apptRes.status === "rejected" && apptRes.reason instanceof ApiError
          ? apptRes.reason.message
          : "Could not load your home. Try again.";
      setState((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: msg }));
      return;
    }

    setState({
      kind: "ok",
      data: {
        appointments,
        visits,
        nextVisit,
        customerProfile,
        hairProfile,
      },
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = useMemo(() => {
    if (profile.kind !== "ready") return "";
    const n = profile.user.name.trim();
    return n.split(/\s+/)[0] ?? n;
  }, [profile]);

  const upcoming = useMemo(() => {
    if (state.kind !== "ok") return null;
    return pickNextUpcoming(state.data.appointments);
  }, [state]);

  const loyalty = useMemo(() => {
    if (state.kind !== "ok" || !state.data.visits) return null;
    return milestoneProgress(state.data.visits.summary.total_visits);
  }, [state]);

  const preferredBarberId =
    state.kind === "ok"
      ? (state.data.customerProfile?.preferred_barber_user_id ?? null)
      : null;
  const preferredBarberName =
    state.kind === "ok"
      ? (state.data.customerProfile?.preferred_barber?.name ??
        state.data.visits?.summary.preferred_barber?.name ??
        null)
      : null;

  const rememberedBooking = useMemo(() => readRememberedBooking(), []);

  const favouriteBookHref =
    preferredBarberId !== null
      ? buildFavouriteBarberBookHref(preferredBarberId, rememberedBooking)
      : null;

  const galleryPhotos =
    state.kind === "ok" ? (state.data.hairProfile?.photos ?? []).slice(0, 8) : [];

  const visitsUnavailable =
    state.kind === "ok" && state.data.visits === null && loyalty === null;

  return (
    <div className="mx-auto w-full max-w-lg sm:max-w-2xl lg:max-w-3xl">
      <ScreenTitle
        eyebrow="Your studio"
        title={firstName ? `Hi, ${firstName}` : "Your home"}
        description="Up next, loyalty, and shortcuts — built for one-thumb days."
        className="gap-4 pb-1 sm:gap-5"
      />

      {state.kind === "error" ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">Something went wrong</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button type="button" onClick={() => void load()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {state.kind === "loading" ? <CustomerHomeSkeleton /> : null}

      {state.kind === "ok" ? (
        <div
          className={cn(
            "motion-content-in mt-8 space-y-9 md:mt-10 md:space-y-10",
            isRefreshing && "optimistic-pending",
          )}
          aria-busy={isRefreshing || undefined}
        >
          <CustomerHomeUpcoming upcoming={upcoming} />

          <CustomerHomeLoyalty
            loyalty={loyalty}
            visitsUnavailable={visitsUnavailable}
          />

          <CustomerHomeShortcuts
            nextVisit={state.data.nextVisit}
            preferredBarberName={preferredBarberName}
            favouriteBookHref={favouriteBookHref}
          />

          <CustomerHomeGallery photos={galleryPhotos} />

          <CustomerHomeNotifications
            items={inbox.latest}
            unread={inbox.unread}
            isLoading={inbox.isLoading}
          />

          <section
            aria-label="More actions"
            className="flex flex-col gap-2 border-t border-border/35 pt-6 sm:flex-row sm:flex-wrap"
          >
            <Button
              asChild
              variant="secondary"
              className="min-h-12 touch-manipulation sm:min-h-11"
            >
              <Link href="/appointments">All appointments</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="min-h-12 touch-manipulation sm:min-h-11"
            >
              <Link href="/book">New booking</Link>
            </Button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
