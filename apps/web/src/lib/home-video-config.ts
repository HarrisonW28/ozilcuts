import type { PublicHomeMarketing } from "@ozilcuts/types";

/**
 * Homepage cinematic video sources.
 *
 * Defaults use MDN’s CC0 sample clips (small, widely cached) so the UI works
 * out of the box. For production, self-host short H.264 + WebM loops under
 * `/public/marketing/` and point env vars at those URLs for full control and
 * CSP compatibility.
 */
const MDN_FLOWER_MP4 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const MDN_FLOWER_WEBM =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm";

function trimUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

export type HomeVideoSources = {
  heroMp4: string;
  heroWebm: string;
  ambientMp4: string;
  ambientWebm: string;
  /** Optional absolute or same-origin poster image for LCP-friendly paint. */
  heroPoster: string | undefined;
};

export function getHomeVideoSources(): HomeVideoSources {
  const heroMp4 =
    trimUrl(process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_MP4) ?? MDN_FLOWER_MP4;
  const heroWebm =
    trimUrl(process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_WEBM) ?? MDN_FLOWER_WEBM;
  const ambientMp4 =
    trimUrl(process.env.NEXT_PUBLIC_HOME_AMBIENT_VIDEO_MP4) ?? heroMp4;
  const ambientWebm =
    trimUrl(process.env.NEXT_PUBLIC_HOME_AMBIENT_VIDEO_WEBM) ?? heroWebm;

  return {
    heroMp4,
    heroWebm,
    ambientMp4,
    ambientWebm,
    heroPoster: trimUrl(process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_POSTER),
  };
}

/** Admin-uploaded shop media overrides env defaults when present. */
export function resolveHomeVideoSources(
  marketing?: PublicHomeMarketing | null,
): HomeVideoSources {
  const defaults = getHomeVideoSources();
  if (marketing === null || marketing === undefined) {
    return defaults;
  }

  const uploadedMp4 = trimUrl(marketing.hero_mp4 ?? undefined);
  const uploadedWebm = trimUrl(marketing.hero_webm ?? undefined);
  const uploadedPoster = trimUrl(marketing.hero_poster ?? undefined);

  const heroMp4 = uploadedMp4 ?? uploadedWebm ?? defaults.heroMp4;
  const heroWebm = uploadedWebm ?? uploadedMp4 ?? defaults.heroWebm;

  return {
    heroMp4,
    heroWebm,
    ambientMp4: heroMp4,
    ambientWebm: heroWebm,
    heroPoster: uploadedPoster ?? defaults.heroPoster,
  };
}
