"use client";

import { resolveShopAssetUrl } from "@/lib/shop-asset-url";
import { fetchPublicHomeMarketing } from "@ozilcuts/api";
import type { PublicHomeMarketing } from "@ozilcuts/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShopBrandingContextValue = {
  branding: PublicHomeMarketing | null;
  logoUrl: string | null;
  status: "loading" | "ready" | "error";
};

const ShopBrandingContext = createContext<ShopBrandingContextValue>({
  branding: null,
  logoUrl: null,
  status: "loading",
});

function withResolvedUrls(
  data: PublicHomeMarketing | null,
): PublicHomeMarketing | null {
  if (!data) return null;
  return {
    ...data,
    logo_url: resolveShopAssetUrl(data.logo_url),
    hero_mp4: resolveShopAssetUrl(data.hero_mp4),
    hero_webm: resolveShopAssetUrl(data.hero_webm),
    hero_poster: resolveShopAssetUrl(data.hero_poster),
  };
}

type ShopBrandingProviderProps = {
  initialBranding?: PublicHomeMarketing | null;
  children: ReactNode;
};

export function ShopBrandingProvider({
  initialBranding = null,
  children,
}: ShopBrandingProviderProps) {
  const seeded = useMemo(
    () => withResolvedUrls(initialBranding),
    [initialBranding],
  );
  const [branding, setBranding] = useState<PublicHomeMarketing | null>(seeded);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    seeded ? "ready" : "loading",
  );

  const load = useCallback(() => {
    void fetchPublicHomeMarketing()
      .then((data) => {
        setBranding(withResolvedUrls(data));
        setStatus("ready");
      })
      .catch(() => {
        setBranding(null);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (!seeded) {
      load();
    }
    const onRefresh = () => load();
    window.addEventListener("ozilcuts:shop-branding-changed", onRefresh);
    return () => {
      window.removeEventListener("ozilcuts:shop-branding-changed", onRefresh);
    };
  }, [load, seeded]);

  useEffect(() => {
    if (initialBranding) {
      setBranding(withResolvedUrls(initialBranding));
      setStatus("ready");
    }
  }, [initialBranding]);

  const value = useMemo<ShopBrandingContextValue>(
    () => ({
      branding,
      logoUrl: branding?.logo_url ?? null,
      status,
    }),
    [branding, status],
  );

  return (
    <ShopBrandingContext.Provider value={value}>
      {children}
    </ShopBrandingContext.Provider>
  );
}

export function useShopBranding(): ShopBrandingContextValue {
  return useContext(ShopBrandingContext);
}

/** @deprecated Prefer useShopBranding — kept for existing imports. */
export function usePublicShopBranding(): PublicHomeMarketing | null {
  return useContext(ShopBrandingContext).branding;
}

export function refreshPublicShopBranding(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ozilcuts:shop-branding-changed"));
}
