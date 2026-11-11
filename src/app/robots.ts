import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/compte", "/api/", "/auth/", "/factures/", "/suivi/", "/boutique/panier", "/boutique/paiement", "/boutique/merci", "/boutique/facture/", "/pronos/ligues/", "/joueurs/comparer?"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
