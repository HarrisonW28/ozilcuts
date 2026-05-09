import type { MetadataRoute } from "next";

/**
 * PWA manifest. Served at `/manifest.webmanifest`.
 *
 * The icons reference Next.js route handlers under the same origin
 * (`/manifest-icon-192`, `/manifest-icon-512`) which render branded
 * PNGs via `next/og` ImageResponse so we don't have to ship raster
 * assets. The smaller favicon and the iOS apple-touch-icon are wired
 * automatically by Next from `app/icon.tsx` and `app/apple-icon.tsx`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ozil Cuts",
    short_name: "Ozil Cuts",
    description: "Book sharp cuts and run your barber shop.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "en",
    dir: "ltr",
    categories: ["lifestyle", "productivity", "business"],
    icons: [
      {
        src: "/manifest-icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/manifest-icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/manifest-icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
