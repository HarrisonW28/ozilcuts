"use client";

import { cn } from "@ozilcuts/ui";

type VisitLocationMapProps = {
  latitude: number;
  longitude: number;
  label?: string;
  className?: string;
};

/** Lightweight OpenStreetMap embed — no API key required. */
export function VisitLocationMap({
  latitude,
  longitude,
  label = "Shop location",
  className,
}: VisitLocationMapProps) {
  const delta = 0.012;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join("%2C");
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-xl border border-primary/30 bg-muted/20 shadow-xs ring-1 ring-primary/10 dark:bg-muted/10">
        <iframe
          title={label}
          src={embedSrc}
          className="block h-52 w-full border-0 sm:h-60"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Open directions
        </a>
      </p>
    </div>
  );
}
