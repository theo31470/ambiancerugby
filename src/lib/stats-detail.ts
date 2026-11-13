import { publicClient } from "@/lib/supabase/server";

/**
 * Deux niveaux de feuille : « détaillée » (plaquages, franchissements, grattages, passes après contact : LNR et World Rugby)
 * et « complète » (en plus courses, mètres, défenseurs battus, passes, jeu au pied, touches… : World Rugby).
 * Pour ramener une stat à 80 minutes, on ne compte que les minutes des matchs où elle est mesurée :
 * sinon un joueur suivi en partie sans feuille détaillée paraît ne jamais défendre.
 */
export const CLES_COMPLETES = ["carries", "metres", "defenders_beaten", "missed_tackles", "dominant_tackles", "passes", "try_assists", "kicks", "kick_metres",
  "lineouts_won", "lineouts_stolen", "rucks_won", "penalties_conceded", "handling_errors", "turnovers_conceded"] as const;
export type CleComplete = (typeof CLES_COMPLETES)[number];
export type Detail = {
  matchs: number; minutes: number; tackles: number; line_breaks: number; turnovers_won: number; offloads: number;
  complet: { matchs: number; minutes: number; tries: number; tackles: number; line_breaks: number; offloads: number; turnovers_won: number } & Record<CleComplete, number>;
};
export const detailVide = (): Detail => ({
  matchs: 0, minutes: 0, tackles: 0, line_breaks: 0, turnovers_won: 0, offloads: 0,
  complet: { matchs: 0, minutes: 0, tries: 0, tackles: 0, line_breaks: 0, offloads: 0, turnovers_won: 0, ...(Object.fromEntries(CLES_COMPLETES.map((k) => [k, 0])) as Record<CleComplete, number>) },
});

async function matchsAvec(ids: string[], colonne: "tackles" | "carries") {
  const db = publicClient();
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await db.from("player_match_stats").select("match_id").in("match_id", ids.slice(i, i + 80)).gt(colonne, 0);
    for (const d of data ?? []) out.add(d.match_id as string);
  }
  return out;
}

/** Détail par saison, plus la clé "carriere" pour le total. */
export async function detailParSaison(playerId: string): Promise<Record<string, Detail>> {
  const db = publicClient();
  const { data: lignes } = await db.from("player_match_stats")
    .select(`match_id,minutes,tries,tackles,line_breaks,turnovers_won,offloads,${CLES_COMPLETES.join(",")}, match:matches!inner(season)`)
    .eq("player_id", playerId).limit(3000);
  const rows = (lignes ?? []) as unknown as (Record<string, number | null> & { match_id: string; match: { season: string } })[];
  const ids = [...new Set(rows.map((r) => r.match_id))];
  const [detailles, complets] = await Promise.all([matchsAvec(ids, "tackles"), matchsAvec(ids, "carries")]);
  const out: Record<string, Detail> = { carriere: detailVide() };
  const n = (v: unknown) => Number(v) || 0;
  for (const r of rows) {
    // saisons internationales « 2025 » rangées avec la saison de club « 2024-2025 »
    for (const cle of ["carriere", r.match.season]) {
      const d = (out[cle] ??= detailVide());
      if (detailles.has(r.match_id)) {
        d.matchs++; d.minutes += n(r.minutes);
        d.tackles += n(r.tackles); d.line_breaks += n(r.line_breaks); d.turnovers_won += n(r.turnovers_won); d.offloads += n(r.offloads);
      }
      if (complets.has(r.match_id)) {
        const c = d.complet;
        c.matchs++; c.minutes += n(r.minutes); c.tries += n(r.tries);
        c.tackles += n(r.tackles); c.line_breaks += n(r.line_breaks); c.offloads += n(r.offloads); c.turnovers_won += n(r.turnovers_won);
        for (const k of CLES_COMPLETES) c[k] += n(r[k]);
      }
    }
  }
  return out;
}

export type ClubSaison = { season: string; matchs: number; team: { id: string; slug: string; name: string; short_name: string | null; logo_url: string | null; is_national: boolean } };

/** Où jouait le joueur, saison par saison, d'après les feuilles de match (clubs seulement, du plus récent au plus ancien). */
export async function clubsParSaison(playerId: string): Promise<ClubSaison[]> {
  const { data } = await publicClient().from("player_match_stats")
    .select("match:matches!inner(season), team:teams!inner(id,slug,name,short_name,logo_url,is_national)")
    .eq("player_id", playerId).limit(2000);
  const tally = new Map<string, ClubSaison>();
  for (const r of (data ?? []) as unknown as { match: { season: string }; team: ClubSaison["team"] }[]) {
    if (r.team.is_national) continue;
    // saisons internationales « 2025 » rangées avec la saison de club « 2024-2025 »
    const s = /^\d{4}$/.test(r.match.season) ? `${Number(r.match.season) - 1}-${r.match.season}` : r.match.season;
    const k = `${s}|${r.team.id}`;
    const x = tally.get(k) ?? { season: s, matchs: 0, team: r.team };
    x.matchs++;
    tally.set(k, x);
  }
  return [...tally.values()].sort((a, b) => b.season.localeCompare(a.season) || b.matchs - a.matchs);
}
