import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/supabase/server";
import { SITE, urlMatch } from "@/lib/seo";

// généré à la demande (pas au build : un build ne doit jamais dépendre de la base)
export const dynamic = "force-dynamic";

/** Lit toutes les lignes d'une requête, par pages de 1 000 (limite de l'API). */
async function tout<T>(requete: (de: number, a: number) => PromiseLike<{ data: T[] | null }>) {
  const out: T[] = [];
  for (let de = 0; de < 60000; de += 1000) {
    const { data } = await requete(de, de + 999);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** Plan du site pour les moteurs de recherche : pages fixes, compétitions, clubs, joueurs, matchs et articles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = publicClient();
  const maintenant = new Date();
  const depuis = new Date(Date.now() - 400 * 86400e3).toISOString();
  const jusqua = new Date(Date.now() + 45 * 86400e3).toISOString();
  const [comps, clubs, joueurs, matchs, articles] = await Promise.all([
    tout<{ slug: string; last_synced_at: string | null }>((de, a) => db.from("competitions").select("slug,last_synced_at").eq("active", true).range(de, a)),
    tout<{ slug: string; updated_at: string | null }>((de, a) => db.from("teams").select("slug,updated_at").eq("categorie", "senior").range(de, a)),
    tout<{ slug: string; updated_at: string | null }>((de, a) => db.from("players").select("slug,updated_at").not("team_id", "is", null).range(de, a)),
    tout<{ id: string; kickoff_at: string; updated_at: string | null; status: string; home: { name: string; slug: string } | null; away: { name: string; slug: string } | null }>((de, a) =>
      db.from("matches").select("id,kickoff_at,updated_at,status, home:teams!matches_home_team_id_fkey(name,slug), away:teams!matches_away_team_id_fkey(name,slug)")
        .gte("kickoff_at", depuis).lte("kickoff_at", jusqua).neq("status", "cancelled").order("kickoff_at", { ascending: false }).range(de, a) as never),
    tout<{ slug: string; updated_at: string | null; published_at: string | null }>((de, a) => db.from("articles").select("slug,updated_at,published_at").eq("status", "published").range(de, a)),
  ]);
  const d = (x: string | null | undefined) => (x ? new Date(x) : maintenant);
  return [
    { url: SITE, changeFrequency: "hourly", priority: 1 },
    ...["/matchs", "/competitions", "/clubs", "/joueurs", "/indice", "/actus", "/pronos", "/pronos/xv", "/abonnement", "/boutique"].map((p) => ({ url: `${SITE}${p}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...comps.map((c) => ({ url: `${SITE}/competitions/${c.slug}`, lastModified: d(c.last_synced_at), changeFrequency: "daily" as const, priority: 0.9 })),
    ...clubs.map((c) => ({ url: `${SITE}/clubs/${c.slug}`, lastModified: d(c.updated_at), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...articles.map((a) => ({ url: `${SITE}/actus/${a.slug}`, lastModified: d(a.updated_at ?? a.published_at), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...matchs.filter((m) => m.home && m.away).map((m) => ({ url: `${SITE}${urlMatch(m as never)}`, lastModified: d(m.updated_at), changeFrequency: (m.status === "finished" ? "monthly" : "hourly") as "monthly" | "hourly", priority: m.status === "finished" ? 0.5 : 0.8 })),
    ...joueurs.map((j) => ({ url: `${SITE}/joueurs/${j.slug}`, lastModified: d(j.updated_at), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
