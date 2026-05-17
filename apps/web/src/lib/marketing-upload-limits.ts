/** Client-side limits aligned with `config/marketing.php` defaults. */
export const MARKETING_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const MARKETING_HERO_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const MARKETING_HERO_POSTER_MAX_BYTES = 5 * 1024 * 1024;

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function validateMarketingLogoFile(file: File): string | null {
  if (file.size > MARKETING_LOGO_MAX_BYTES) {
    return `Logo must be under ${formatMb(MARKETING_LOGO_MAX_BYTES)}.`;
  }
  return null;
}

export function validateMarketingHeroVideoFile(file: File): string | null {
  if (file.size > MARKETING_HERO_VIDEO_MAX_BYTES) {
    return `Video must be under ${formatMb(MARKETING_HERO_VIDEO_MAX_BYTES)}. Compress or trim the file, or raise MARKETING_HERO_VIDEO_MAX_KB on the API.`;
  }
  return null;
}

export function validateMarketingHeroPosterFile(file: File): string | null {
  if (file.size > MARKETING_HERO_POSTER_MAX_BYTES) {
    return `Poster must be under ${formatMb(MARKETING_HERO_POSTER_MAX_BYTES)}.`;
  }
  return null;
}
