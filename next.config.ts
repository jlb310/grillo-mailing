import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Reuse Turbopack's compilation cache between builds (kept in a BuildKit
    // cache mount in the Dockerfile) — cuts the compile step on redeploys
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
