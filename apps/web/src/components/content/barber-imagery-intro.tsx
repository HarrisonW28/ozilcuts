"use client";

import { VisualStorySection } from "@/components/content/visual-story-section";
import { Button } from "@ozilcuts/ui";
import Link from "next/link";
import type { ReactNode } from "react";

type BarberImageryIntroProps = {
  barberUserId: number;
  barberName?: string;
  title?: string;
  description?: ReactNode;
};

export function BarberImageryIntro({
  barberUserId,
  barberName,
  title = "See the work before you book",
  description = "Portfolio photos are shared with client consent. Browse full before and after sets on the gallery — every frame is there to earn your trust, not just fill the page.",
}: BarberImageryIntroProps) {
  return (
    <VisualStorySection
      eyebrow="Visual trust"
      title={title}
      description={description}
      footer={
        <Button asChild variant="outline" size="sm" className="min-h-11 w-fit touch-manipulation">
          <Link href={`/barbers/${barberUserId}/portfolio`}>
            {barberName ? `Open ${barberName.split(" ")[0]}'s gallery` : "Open full gallery"}
          </Link>
        </Button>
      }
    />
  );
}
