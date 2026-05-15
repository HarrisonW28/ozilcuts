/**
 * Marketing social handles and lightweight Instagram highlight tiles.
 * No embeds — link-out only for performance and CSP simplicity.
 */

export type SocialPlatform = "instagram" | "tiktok";

export type SocialLink = {
  platform: SocialPlatform;
  handle: string;
  href: string;
  label: string;
};

export type InstagramHighlight = {
  id: string;
  label: string;
  href: string;
  /** Same-origin or allowlisted CDN; omit for gradient tile. */
  imageUrl?: string;
};

export type SocialProofStats = {
  followersLabel: string;
  postsLabel: string;
};

export type SocialConfig = {
  instagramHandle: string | null;
  instagramProfileUrl: string | null;
  links: SocialLink[];
  highlights: InstagramHighlight[];
  proof: SocialProofStats;
};

const DEFAULT_HIGHLIGHTS: InstagramHighlight[] = [
  {
    id: "fades",
    label: "Fades",
    href: "https://www.instagram.com/",
  },
  {
    id: "texture",
    label: "Texture",
    href: "https://www.instagram.com/",
  },
  {
    id: "lineups",
    label: "Line-ups",
    href: "https://www.instagram.com/",
  },
  {
    id: "studio",
    label: "Studio",
    href: "https://www.instagram.com/",
  },
];

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function normalizeHandle(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

function profileUrl(platform: SocialPlatform, handle: string): string {
  const h = normalizeHandle(handle);
  if (platform === "tiktok") {
    return `https://www.tiktok.com/@${h}`;
  }
  return `https://www.instagram.com/${h}/`;
}

function parseHighlightsJson(raw: string | undefined): InstagramHighlight[] {
  if (!raw?.trim()) return DEFAULT_HIGHLIGHTS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_HIGHLIGHTS;
    const out: InstagramHighlight[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : null;
      const label = typeof row.label === "string" ? row.label : null;
      const href = typeof row.href === "string" ? row.href : null;
      if (!id || !label || !href) continue;
      out.push({
        id,
        label,
        href,
        imageUrl:
          typeof row.imageUrl === "string" ? row.imageUrl.trim() : undefined,
      });
    }
    return out.length > 0 ? out : DEFAULT_HIGHLIGHTS;
  } catch {
    return DEFAULT_HIGHLIGHTS;
  }
}

export function getSocialConfig(): SocialConfig {
  const instagramHandle =
    trim(process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE) ?? "ozilcuts";
  const tiktokHandle = trim(process.env.NEXT_PUBLIC_TIKTOK_HANDLE);
  const ig = instagramHandle ? normalizeHandle(instagramHandle) : null;

  const highlightsRaw = parseHighlightsJson(
    process.env.NEXT_PUBLIC_INSTAGRAM_HIGHLIGHTS_JSON,
  );
  const instagramProfileUrl = ig ? profileUrl("instagram", ig) : null;

  const highlights = highlightsRaw.map((tile) => ({
    ...tile,
    href:
      tile.href === "https://www.instagram.com/" && instagramProfileUrl
        ? instagramProfileUrl
        : tile.href,
  }));

  const links: SocialLink[] = [];
  if (ig) {
    links.push({
      platform: "instagram",
      handle: ig,
      href: instagramProfileUrl!,
      label: `@${ig} on Instagram`,
    });
  }
  if (tiktokHandle) {
    const tt = normalizeHandle(tiktokHandle);
    links.push({
      platform: "tiktok",
      handle: tt,
      href: profileUrl("tiktok", tt),
      label: `@${tt} on TikTok`,
    });
  }

  return {
    instagramHandle: ig,
    instagramProfileUrl,
    links,
    highlights,
    proof: {
      followersLabel:
        trim(process.env.NEXT_PUBLIC_SOCIAL_PROOF_FOLLOWERS) ?? "2.4k+",
      postsLabel: trim(process.env.NEXT_PUBLIC_SOCIAL_PROOF_POSTS) ?? "180+",
    },
  };
}

export function hasSocialPresence(config: SocialConfig = getSocialConfig()): boolean {
  return config.links.length > 0;
}
