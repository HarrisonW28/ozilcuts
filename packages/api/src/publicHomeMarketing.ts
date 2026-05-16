import type { PublicHomeMarketing } from "@ozilcuts/types";

import { getApiBaseUrl } from "./base";

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
): Promise<void> {
  const body = new FormData();
  body.append("video", video);

  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/marketing/hero-video`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : "Unable to upload hero video.";
    throw new Error(message);
  }
}

export async function uploadShopHeroPoster(
  token: string,
  poster: File,
): Promise<void> {
  const body = new FormData();
  body.append("poster", poster);

  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/marketing/hero-poster`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error("Unable to upload hero poster.");
  }
}

export async function deleteShopHeroVideo(token: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/marketing/hero-video`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to remove hero video.");
  }
}
