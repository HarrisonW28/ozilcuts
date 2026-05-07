import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ozilcuts/ui", "@ozilcuts/api"],
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
