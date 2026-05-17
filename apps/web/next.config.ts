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

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@ozilcuts/ui", "@ozilcuts/api"],
  images: {
    remotePatterns: imageRemotePatterns,
  },
  webpack(config) {
    const existing = Array.isArray(config.ignoreWarnings)
      ? config.ignoreWarnings
      : [];
    config.ignoreWarnings = [
      ...existing,
      /postcss-import: @import must precede all other statements/,
      (warning: { message?: string }) =>
        String(warning.message ?? "").includes(
          "postcss-import: @import must precede",
        ),
    ];
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const backend = (
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000"
    ).replace(/\/$/, "");

    const rewrites: { source: string; destination: string }[] = [
      {
        source: "/shop-media/:path*",
        destination: `${backend}/api/v1/public/marketing/asset?f=:path*`,
      },
    ];

    if (process.env.NODE_ENV === "development") {
      rewrites.push({
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
