import { publicClient } from "./supabase/server";
import { TEAM_LITE } from "./queries";
import type { TeamLite } from "./types";

/**
 * L'algorithme Ambiance Rugby.
 *
 * - Indice Ambiance : note de puissance façon Elo (base 1500), recalculée en base à chaque
 *   résultat (fonction recompute_ratings). Avantage du terrain : 50 points. Un gros écart au
 *   score fait bouger la note davantage, sauf si le favori écrase un adversaire bien plus faible.
 * - Pronostic : probabilité de victoire déduite de l'écart d'Indice, petite part de nul.
 * - Forme : 0 à 100 sur les 5 derniers matchs (vue team_form).
 * - Note des joueurs : sur 10, à partir de la feuille de stats du match (player_match_stats).
 */
export const AVANTAGE_TERRAIN = 50;

export type Rating = { team_id: string; rating: number; rating_7d: number | null; matches: number; rank: number | null };
export type Form = { team_id: string; form: number; last5: string; games: number };
export type Prono = { home: number; draw: number; away: number; margin: number; favori: "home" | "away" | null };

export function pronostic(rHome?: number | null, rAway?: number | null): Prono | null {
  if (rHome == null || rAway == null) return null;
  const diff = rHome + AVANTAGE_TERRAIN - rAway;
  const draw = 0.035 * Math.max(0, 1 - Math.abs(diff) / 350);
  const homeRaw = 1 / (1 + Math.pow(10, -diff / 400));
  const home = homeRaw * (1 - draw);
  const away = 1 - home - draw;
  const margin = Math.round(Math.abs(diff) / 10);
  return { home, draw, away, margin, favori: Math.abs(home - away) < 0.04 ? null : home > away ? "home" : "away" };
}

export const pct = (x: number) => `${Math.round(x * 100)} %`;

export async function getRatings(teamIds?: string[]) {
  let q = publicClient().from("team_ratings").select("team_id,rating,rating_7d,matches,rank");
  if (teamIds) q = q.in("team_id", teamIds);
  const { data } = await q;
  return new Map(((data ?? []) as Rating[]).map((r) => [r.team_id, r]));
}

export async function getForms(teamIds?: string[]) {
  let q = publicClient().from("team_form").select("team_id,form,last5,games");
  if (teamIds) q = q.in("team_id", teamIds);
  const { data } = await q;
  return new Map(((data ?? []) as Form[]).map((f) => [f.team_id, f]));
}

export type PowerRow = Rating & { team: TeamLite & { is_national: boolean }; form: Form | null };

/** Classement de puissance (clubs ou sélections). */
export async function getPowerRanking(national = false, limit = 200): Promise<PowerRow[]> {
  const { data } = await publicClient()
    .from("team_ratings")
    .select(`team_id,rating,rating_7d,matches,rank, team:teams!inner(${TEAM_LITE},is_national,categorie)`)
    .eq("team.is_national", national)
    // équipes premières seulement (ni moins de 20 ans, ni équipes A)
    .eq("team.categorie", "senior")
    .order("rating", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as (Rating & { team: PowerRow["team"] })[];
  const forms = await getForms(rows.map((r) => r.team_id));
  return rows.map((r) => ({ ...r, form: forms.get(r.team_id) ?? null }));
}

export async function getRatingHistory(teamId: string) {
  const { data } = await publicClient().from("rating_history").select("played_at,rating,delta").eq("team_id", teamId).order("played_at");
  return (data ?? []) as { played_at: string; rating: number; delta: number }[];
}

/** Couleur et mot pour un indice de forme. */
export function formeLabel(f: number) {
  if (f >= 75) return { mot: "En feu", cls: "bg-moutarde text-bordeaux" };
  if (f >= 55) return { mot: "En forme", cls: "bg-ok/15 text-ok" };
  if (f >= 40) return { mot: "Irrégulier", cls: "bg-teinte text-sourdine" };
  return { mot: "En difficulté", cls: "bg-alerte/10 text-alerte" };
}
