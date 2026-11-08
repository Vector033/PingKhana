import type { NextConfig } from "next";

// Same list as src/lib/imageHosts.ts (the config loader cannot import project files).
const IMAGE_HOSTS = [
  "www.cmu.ac.th",
  "www.science.cmu.ac.th",
  "www.cs.science.cmu.ac.th",
  "storage.sdd.oou.cmu.ac.th",
  "www.moe.go.th",
  "www.obec.go.th",
  "www.ksp.or.th",
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Thumbnails come from the source sites' list pages; Next resizes them (some are 3 MB PNGs).
  images: {
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    minimumCacheTTL: 2_592_000, // 30 days: a post's poster does not change
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
