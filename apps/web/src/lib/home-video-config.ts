import type { PublicHomeMarketing } from "@ozilcuts/types";

export type HeroMediaBundle = {
  mp4: string | null;
  webm: string | null;
  poster: string | null;
};

export type HomeVideoSources = {
  desktop: HeroMediaBundle | null;
  mobile: HeroMediaBundle | null;
};

function trimUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && v.length > 0 ? v : null;
}

function bundleFromMarketing(
  mp4: string | null | undefined,
  webm: string | null | undefined,
  poster: string | null | undefined,
): HeroMediaBundle | null {
  const resolvedMp4 = trimUrl(mp4);
  const resolvedWebm = trimUrl(webm);
  const resolvedPoster = trimUrl(poster);

  if (!resolvedMp4 && !resolvedWebm && !resolvedPoster) {
    return null;
  }

  return {
    mp4: resolvedMp4,
    webm: resolvedWebm,
    poster: resolvedPoster,
  };
}

export function heroBundleHasVideo(bundle: HeroMediaBundle | null): boolean {
  if (!bundle) return false;
  return Boolean(bundle.mp4 || bundle.webm);
}

/** True when any uploaded hero video exists (desktop and/or mobile). */
export function hasHeroVideo(sources: HomeVideoSources): boolean {
  return heroBundleHasVideo(sources.desktop) || heroBundleHasVideo(sources.mobile);
}

/** No default sample clips — only admin-uploaded media is used. */
export function resolveHomeVideoSources(
  marketing?: PublicHomeMarketing | null,
): HomeVideoSources {
  if (marketing == null) {
    return { desktop: null, mobile: null };
  }

  const desktop = bundleFromMarketing(
    marketing.hero_desktop_mp4,
    marketing.hero_desktop_webm,
    marketing.hero_desktop_poster,
  );

  const mobile = bundleFromMarketing(
    marketing.hero_mobile_mp4,
    marketing.hero_mobile_webm,
    marketing.hero_mobile_poster,
  );

  return { desktop, mobile };
}

/** Prefer desktop loop for ambient panels; fall back to mobile. */
export function resolveAmbientBundle(
  sources: HomeVideoSources,
): HeroMediaBundle | null {
  if (heroBundleHasVideo(sources.desktop)) {
    return sources.desktop;
  }
  if (heroBundleHasVideo(sources.mobile)) {
    return sources.mobile;
  }
  return null;
}
