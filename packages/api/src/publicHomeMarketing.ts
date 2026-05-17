import type { HeroMediaVariant, PublicHomeMarketing } from "@ozilcuts/types";

import { getApiBaseUrl } from "./base";
import {
  assertMarketingUploadOk,
  marketingUploadUrl,
} from "./marketingUpload";

type PublicHomeMarketingResponse = {
  data: PublicHomeMarketing;
};

export async function fetchPublicHomeMarketing(): Promise<PublicHomeMarketing> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/public/home-marketing`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Unable to load homepage marketing media.");
  }

  const json = (await res.json()) as PublicHomeMarketingResponse;
  return json.data;
}

export async function uploadShopHeroVideo(
  token: string,
  video: File,
  variant: HeroMediaVariant = "desktop",
): Promise<void> {
  const body = new FormData();
  body.append("video", video);
  body.append("variant", variant);

  const res = await fetch(
    marketingUploadUrl("/api/v1/admin/marketing/hero-video"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    },
  );

  await assertMarketingUploadOk(res);
}

export async function uploadShopHeroPoster(
  token: string,
  poster: File,
  variant: HeroMediaVariant = "desktop",
): Promise<void> {
  const body = new FormData();
  body.append("poster", poster);
  body.append("variant", variant);

  const res = await fetch(
    marketingUploadUrl("/api/v1/admin/marketing/hero-poster"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    },
  );

  await assertMarketingUploadOk(res);
}

export async function deleteShopHeroVideo(
  token: string,
  variant?: HeroMediaVariant,
): Promise<void> {
  const query = variant ? `?variant=${encodeURIComponent(variant)}` : "";
  const res = await fetch(
    marketingUploadUrl(`/api/v1/admin/marketing/hero-video${query}`),
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  await assertMarketingUploadOk(res);
}

export async function deleteShopHeroPoster(
  token: string,
  variant: HeroMediaVariant,
): Promise<void> {
  const res = await fetch(
    marketingUploadUrl(
      `/api/v1/admin/marketing/hero-poster?variant=${encodeURIComponent(variant)}`,
    ),
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  await assertMarketingUploadOk(res);
}

export async function uploadShopLogo(token: string, logo: File): Promise<void> {
  const body = new FormData();
  body.append("logo", logo);

  const res = await fetch(marketingUploadUrl("/api/v1/admin/marketing/logo"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  await assertMarketingUploadOk(res);
}

export async function deleteShopLogo(token: string): Promise<void> {
  const res = await fetch(marketingUploadUrl("/api/v1/admin/marketing/logo"), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  await assertMarketingUploadOk(res);
}

export async function updateShopInstagramHandle(
  token: string,
  instagramHandle: string | null,
): Promise<void> {
  const res = await fetch(
    marketingUploadUrl("/api/v1/admin/marketing/instagram"),
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ instagram_handle: instagramHandle }),
    },
  );

  await assertMarketingUploadOk(res);
}
