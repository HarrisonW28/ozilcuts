"use client";

import { ShopDefaultHoursFields } from "@/components/shop-default-hours-fields";
import { useAppToast } from "@/lib/app-toast";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  flattenShopHoursWeekdaysToPayload,
  shopHoursHaveBookableWindows,
  weekdaysFromShopAdminPayload,
} from "@/lib/shop-default-hours";
import { refreshPublicShopBranding } from "@/lib/use-public-shop-branding";
import { patchShopOnboarding } from "@ozilcuts/api";
import type { BarberAvailabilityDay, ShopAdminState } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ozilcuts/ui";
import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";

type AdminShopVisitPanelProps = {
  shopAdmin: ShopAdminState;
  onUpdated: () => void;
};

export function AdminShopVisitPanel({
  shopAdmin,
  onUpdated,
}: AdminShopVisitPanelProps) {
  const [hoursWeekdays, setHoursWeekdays] = useState<BarberAvailabilityDay[]>(
    () => weekdaysFromShopAdminPayload(shopAdmin.shop_default_hours),
  );
  const [address, setAddress] = useState(shopAdmin.shop_public_address ?? "");
  const [visitNote, setVisitNote] = useState(shopAdmin.shop_visit_note ?? "");
  const [latitude, setLatitude] = useState(
    shopAdmin.shop_latitude != null ? String(shopAdmin.shop_latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    shopAdmin.shop_longitude != null ? String(shopAdmin.shop_longitude) : "",
  );
  const toast = useAppToast();
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;

    if (!shopHoursHaveBookableWindows(hoursWeekdays)) {
      toast.error("Set at least one open day with valid hours.");
      return;
    }

    let shop_latitude: number | null = null;
    let shop_longitude: number | null = null;
    const latTrim = latitude.trim();
    const lngTrim = longitude.trim();

    if (latTrim !== "" || lngTrim !== "") {
      const latN = Number.parseFloat(latTrim);
      const lngN = Number.parseFloat(lngTrim);
      if (
        !Number.isFinite(latN) ||
        !Number.isFinite(lngN) ||
        latN < -90 ||
        latN > 90 ||
        lngN < -180 ||
        lngN > 180
      ) {
        toast.error("Enter valid latitude and longitude, or leave both blank.");
        return;
      }
      shop_latitude = latN;
      shop_longitude = lngN;
    }

    setBusy(true);
    try {
      await patchShopOnboarding(token, {
        shop_default_hours: flattenShopHoursWeekdaysToPayload(hoursWeekdays),
        shop_public_address: address.trim() === "" ? null : address.trim(),
        shop_visit_note: visitNote.trim() === "" ? null : visitNote.trim(),
        shop_latitude,
        shop_longitude,
      });
      refreshPublicShopBranding();
      onUpdated();
      toast.success("Visit details saved — refresh the homepage to preview.");
    } catch (e: unknown) {
      const message =
        e instanceof Error && e.message
          ? e.message
          : "Could not save visit details. Try again.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [address, hoursWeekdays, latitude, longitude, onUpdated, toast, visitNote]);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-primary" aria-hidden />
          Contact &amp; visit
        </CardTitle>
        <CardDescription>
          Hours and map on the homepage &ldquo;Plan your visit&rdquo; section.
          Guests still get full arrival details after they book.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ShopDefaultHoursFields
          value={hoursWeekdays}
          onChange={setHoursWeekdays}
          context="public"
        />

        <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4 dark:bg-muted/5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="size-4 text-primary" aria-hidden />
            Location &amp; map
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-public-address">Public address (optional)</Label>
            <Input
              id="shop-public-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
              }}
              placeholder="e.g. 12 High Street, London"
              autoComplete="street-address"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-visit-note">Visit note (optional)</Label>
            <textarea
              id="shop-visit-note"
              value={visitNote}
              onChange={(e) => {
                setVisitNote(e.target.value);
              }}
              rows={3}
              placeholder="Parking, buzzer, or appointment-only seating — shown on the homepage."
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-[5.5rem] w-full resize-y rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-[3px]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-map-lat">Latitude (WGS84)</Label>
              <Input
                id="shop-map-lat"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                }}
                placeholder="e.g. 51.5074"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-map-lng">Longitude (WGS84)</Label>
              <Input
                id="shop-map-lng"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                }}
                placeholder="e.g. -0.1278"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Set both coordinates to show a map on the homepage. You can copy
            values from{" "}
            <a
              href="https://www.openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              OpenStreetMap
            </a>{" "}
            (right-click → show address).
          </p>
        </div>

        <Button type="button" pending={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save visit details"}
        </Button>
      </CardContent>
    </Card>
  );
}
