import type { SupabaseClient } from "@supabase/supabase-js";

/** Fait de jeu lu automatiquement (feuille ESPN ou Claude), déjà rattaché à un joueur quand c'est possible. */
export type EvtPropose = { minute: number | null; cote: "home" | "away"; player_id: string | null; nom: string; type: string };

/**
 * Écrit le fil du match lu automatiquement. Ne touche jamais à un fil saisi à la main :
 * s'il en existe un, on ne fait rien. Les faits d'une lecture automatique précédente sont remplacés.
 */
export async function ecrireFil(db: SupabaseClient, m: { id: string; home_team_id: string; away_team_id: string }, evts: EvtPropose[], source: "claude" | "espn" | "lnr" = "claude") {
  if (!evts.length) return 0;
  const { count: manuels } = await db.from("match_events").select("id", { count: "exact", head: true }).eq("match_id", m.id).eq("source", "manuel");
  if (manuels) return 0;
  await db.from("match_events").delete().eq("match_id", m.id).in("source", ["claude", "espn", "lnr"]);
  const rows = evts.map((e) => ({
    match_id: m.id, kind: e.type, minute: e.minute, team_id: e.cote === "home" ? m.home_team_id : m.away_team_id,
    player_id: e.player_id, text: e.type === "sub" ? e.nom || null : e.player_id ? null : e.nom || null, source,
  }));
  const { error } = await db.from("match_events").insert(rows);
  return error ? 0 : rows.length;
}

/** Traduit les références de Claude (H12, A3…) en joueurs. */
export function filDepuisIA(evts: { minute: number | null; equipe: "home" | "away"; ref: string | null; nom_lu: string; type: string }[], refs: Map<string, string>): EvtPropose[] {
  return evts.map((e) => {
    const ok = e.ref && refs.has(e.ref) && (e.ref.startsWith("H") ? e.equipe === "home" : e.equipe === "away");
    return { minute: e.minute, cote: e.equipe, player_id: ok ? refs.get(e.ref!)! : null, nom: e.nom_lu, type: e.type };
  });
}
