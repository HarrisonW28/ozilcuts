"use client";

import { HaircutShareCard } from "@/components/social/haircut-share-card";
import { getStoredAuthToken } from "@/lib/auth-token";
import { fetchAppointmentHaircutPhotos } from "@ozilcuts/api";
import { Skeleton } from "@ozilcuts/ui";
import { useEffect, useState } from "react";

type HaircutShareCardLoaderProps = {
  appointmentId: number;
  barberName: string;
  serviceName?: string | null;
  visitDateIso?: string | null;
  barberUserId?: number | null;
  className?: string;
};

export function HaircutShareCardLoader({
  appointmentId,
  barberName,
  serviceName,
  visitDateIso,
  barberUserId,
  className,
}: HaircutShareCardLoaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    void fetchAppointmentHaircutPhotos(token, appointmentId)
      .then((res) => {
        if (cancelled) return;
        const after = res.data.find((p) => p.kind === "after");
        setPhotoUrl(after?.url ?? null);
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <Skeleton
        className="h-[min(18rem,52vw)] w-full rounded-2xl"
        aria-label="Loading share card"
      />
    );
  }

  return (
    <HaircutShareCard
      className={className}
      appointmentId={appointmentId}
      barberName={barberName}
      serviceName={serviceName}
      visitDateIso={visitDateIso}
      barberUserId={barberUserId}
      photoUrl={photoUrl}
    />
  );
}
