import type { SupabaseClient } from "@supabase/supabase-js";
import { journees, lienCorrespond, lireDiffuseursLnr } from "./feuilles/lnr";
import { SELECT_MATCH_FEUILLE } from "./feuilles/lnr";
import type { MatchLocal } from "./feuilles/espn";

type M = MatchLocal & { id: string; round: string | null; season: string | null; lnr_url: string | null; tv: string | null; competition: { lnr_site: string | null } };

/**
 * « Où regarder » : relève sur le calendrier de la LNR la ou les chaînes de chaque match de Top 14 et de Pro D2
 * à venir (3 semaines), et les enregistre dans matches.tv. Une page de calendrier par journée, pas plus.
 */
export async function synchroniserDiffuseurs(db: SupabaseClient, jours = 21) {
  const { data } = await db.from("matches").select(`${SELECT_MATCH_FEUILLE}, tv`)
    .in("status", ["scheduled", "live", "halftime"])
    .gte("kickoff_at", new Date(Date.now() - 6 * 3600e3).toISOString())
    .lte("kickoff_at", new Date(Date.now() + jours * 86400e3).toISOString());
  const matchs = ((data ?? []) as unknown as M[]).filter((m) => m.competition?.lnr_site && m.season && m.round);
  const groupes = new Map<string, M[]>();
  for (const m of matchs) {
    const cle = `${m.competition.lnr_site}|${m.season}|${m.round}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), m]);
  }
  let pages = 0, maj = 0;
  const sans: string[] = [];
  for (const [cle, ms] of groupes) {
    const [site, saison, round] = cle.split("|");
    let lignes: Awaited<ReturnType<typeof lireDiffuseursLnr>> = [];
    for (const j of journees(round)) {
      lignes = await lireDiffuseursLnr(site, saison, j).catch(() => []);
      pages++;
      if (lignes.length) break;
    }
    for (const m of ms) {
      const l = lignes.find((x) => lienCorrespond(x.lien, m.home, m.away));
      if (!l) { sans.push(`${m.home.name}-${m.away.name}`); continue; }
      const tv = l.chaines.length ? l.chaines.join(" / ") : null;
      const patch: Record<string, string> = {};
      if (tv && tv !== m.tv) patch.tv = tv;
      if (!m.lnr_url) patch.lnr_url = l.lien;
      if (Object.keys(patch).length) { await db.from("matches").update(patch).eq("id", m.id); maj++; }
    }
  }
  return { matchs: matchs.length, pages, maj, sans };
}
