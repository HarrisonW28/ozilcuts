import { ImageResponse } from "next/og";
import { BrandIconJsx } from "@/lib/brand-icon";

const SIZE = 192;

export function GET(): Promise<Response> | Response {
  return new ImageResponse(<BrandIconJsx size={SIZE} maskable />, {
    width: SIZE,
    height: SIZE,
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
