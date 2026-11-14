import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // envoi d'images depuis la rédaction (Vercel limite le corps des requêtes à 4,5 Mo)
  experimental: {
    serverActions: { bodySizeLimit: "4.4mb" },
  },
  // app installable : le service worker et le manifeste ne sont jamais gardés en cache par le navigateur
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/hors-ligne.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
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
