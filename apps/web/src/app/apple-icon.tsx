import { ImageResponse } from "next/og";
import { BrandIconJsx } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIconJsx size={size.width} />, size);
}
