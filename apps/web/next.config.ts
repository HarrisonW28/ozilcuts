import type { NextConfig } from "next";

const imageRemotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] =
  [
    {
      protocol: "http",
      hostname: "localhost",
      port: "8000",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
      port: "8000",
      pathname: "/**",
    },
  ];

for (const rawUrl of [process.env.BACKEND_URL, process.env.NEXT_PUBLIC_API_URL]) {
  if (!rawUrl) continue;
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      imageRemotePatterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      });
    }
  } catch {
    // Ignore malformed local env values; rewrites keep handling API calls.
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@ozilcuts/ui", "@ozilcuts/api"],
  images: {
    remotePatterns: imageRemotePatterns,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
