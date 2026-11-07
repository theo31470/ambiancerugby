import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // envoi d'images depuis la rédaction (Vercel limite le corps des requêtes à 4,5 Mo)
  experimental: {
    serverActions: { bodySizeLimit: "4.4mb" },
  },
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
