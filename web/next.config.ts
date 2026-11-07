import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Thumbnails come from the source sites' list pages; Next resizes them (some are 3 MB PNGs).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.cmu.ac.th" },
      { protocol: "https", hostname: "www.science.cmu.ac.th" },
      { protocol: "https", hostname: "www.cs.science.cmu.ac.th" },
      { protocol: "https", hostname: "storage.sdd.oou.cmu.ac.th" },
    ],
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
