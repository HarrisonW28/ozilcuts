"use client";

import { fetchPublicHomeMarketing } from "@ozilcuts/api";
import type { PublicHomeMarketing } from "@ozilcuts/types";
import { useCallback, useEffect, useState } from "react";

export function usePublicShopBranding(): PublicHomeMarketing | null {
  const [branding, setBranding] = useState<PublicHomeMarketing | null>(null);

  const load = useCallback(() => {
    void fetchPublicHomeMarketing()
      .then(setBranding)
      .catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("ozilcuts:shop-branding-changed", onRefresh);
    return () => {
      window.removeEventListener("ozilcuts:shop-branding-changed", onRefresh);
    };
  }, [load]);

  return branding;
}

export function refreshPublicShopBranding(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ozilcuts:shop-branding-changed"));
}
