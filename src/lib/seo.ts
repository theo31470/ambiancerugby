import { slugify } from "./format";

/** Adresse publique du site (domaine principal). */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiance-rugby.fr").replace(/\/$/, "");
export const absolue = (chemin: string) => `${SITE}${chemin.startsWith("/") ? "" : "/"}${chemin}`;

type MatchLien = { id: string; kickoff_at: string; home?: { name: string; slug?: string } | null; away?: { name: string; slug?: string } | null };

/**
 * Adresse lisible d'un match : /matchs/stade-toulousain-asm-clermont-2026-11-15
 * (les deux équipes et le jour suffisent : une affiche ne se joue qu'une fois par jour).
 */
export function urlMatch(m: MatchLien) {
  if (!m.home || !m.away) return `/matchs/${m.id}`;
  return `/matchs/${slugify(m.home.slug ?? m.home.name)}-${slugify(m.away.slug ?? m.away.name)}-${jourParis(m.kickoff_at)}`;
}
const jourParis = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ce que l'adresse permet de retrouver : l'identifiant complet, ses 8 premiers caractères (anciennes adresses, redirigées),
 * ou l'affiche et le jour (adresse actuelle).
 */
export function cleMatch(param: string): { id: string } | { prefixe: string } | { jour: string; chemin: string } | null {
  const p = decodeURIComponent(param).toLowerCase();
  if (UUID.test(p)) return { id: p };
  const m = p.match(/-\d{4}-\d{2}-\d{2}-([0-9a-f]{8})$/);
  if (m) return { prefixe: m[1] };
  const j = p.match(/^[a-z0-9-]+-(\d{4}-\d{2}-\d{2})$/);
  return j ? { jour: j[1], chemin: `/matchs/${p}` } : null;
}

/** Le match dont l'adresse lisible est `chemin`, parmi ceux joués autour de ce jour. */
export function memeAdresse<T extends MatchLien>(matchs: T[], chemin: string): T | null {
  return matchs.find((m) => urlMatch(m) === chemin) ?? null;
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
