import { publicClient } from "@/lib/supabase/server";

/**
 * Plaquages, franchissements, grattages et passes après contact n'existent que sur les feuilles
 * détaillées (LNR). Pour les ramener à 80 minutes, on ne compte que les minutes de ces matchs-là :
 * sinon un joueur suivi en partie via ESPN paraît ne jamais défendre.
 */
export type Detail = { matchs: number; minutes: number; tackles: number; line_breaks: number; turnovers_won: number; offloads: number };
const vide = (): Detail => ({ matchs: 0, minutes: 0, tackles: 0, line_breaks: 0, turnovers_won: 0, offloads: 0 });

/** Détail par saison, plus la clé "carriere" pour le total. */
export async function detailParSaison(playerId: string): Promise<Record<string, Detail>> {
  const db = publicClient();
  const { data: lignes } = await db.from("player_match_stats")
    .select("match_id,minutes,tackles,line_breaks,turnovers_won,offloads, match:matches!inner(season)")
    .eq("player_id", playerId);
  const rows = (lignes ?? []) as unknown as { match_id: string; minutes: number | null; tackles: number | null; line_breaks: number | null; turnovers_won: number | null; offloads: number | null; match: { season: string } }[];
  const ids = [...new Set(rows.map((r) => r.match_id))];
  const detailles = new Set<string>();
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await db.from("player_match_stats").select("match_id").in("match_id", ids.slice(i, i + 80)).gt("tackles", 0);
    for (const d of data ?? []) detailles.add(d.match_id as string);
  }
  const out: Record<string, Detail> = { carriere: vide() };
  for (const r of rows) {
    if (!detailles.has(r.match_id)) continue;
    for (const cle of ["carriere", r.match.season]) {
      const d = (out[cle] ??= vide());
      d.matchs++; d.minutes += Number(r.minutes) || 0;
      d.tackles += Number(r.tackles) || 0; d.line_breaks += Number(r.line_breaks) || 0;
      d.turnovers_won += Number(r.turnovers_won) || 0; d.offloads += Number(r.offloads) || 0;
    }
  }
  return out;
}
