import { slugify } from "./format";

/** Adresse publique du site (domaine principal). */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiance-rugby.fr").replace(/\/$/, "");
export const absolue = (chemin: string) => `${SITE}${chemin.startsWith("/") ? "" : "/"}${chemin}`;

type MatchLien = { id: string; kickoff_at: string; home?: { name: string; slug?: string } | null; away?: { name: string; slug?: string } | null };

/**
 * Adresse lisible d'un match : /matchs/stade-toulousain-asm-clermont-2026-11-15-dd27821d
 * (les 8 premiers caractères de l'identifiant garantissent l'unicité ; le reste sert au référencement).
 */
export function urlMatch(m: MatchLien) {
  if (!m.home || !m.away) return `/matchs/${m.id}`;
  const jour = new Date(m.kickoff_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  return `/matchs/${slugify(m.home.slug ?? m.home.name)}-${slugify(m.away.slug ?? m.away.name)}-${jour}-${m.id.slice(0, 8)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ce que l'adresse permet de retrouver : l'identifiant complet, ou ses 8 premiers caractères. */
export function cleMatch(param: string): { id: string } | { prefixe: string } | null {
  const p = decodeURIComponent(param).toLowerCase();
  if (UUID.test(p)) return { id: p };
  const m = p.match(/-([0-9a-f]{8})$/);
  return m ? { prefixe: m[1] } : null;
}

/** Données structurées (schema.org) à glisser dans la page. */
export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export const ORGANISATION = {
  "@type": "NewsMediaOrganization",
  "@id": `${SITE}/#organisation`,
  name: "Ambiance Rugby",
  url: SITE,
  logo: { "@type": "ImageObject", url: `${SITE}/icon.png` },
};

export function filAriane(etapes: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map(([nom, chemin], i) => ({ "@type": "ListItem", position: i + 1, name: nom, item: absolue(chemin) })),
  };
}
