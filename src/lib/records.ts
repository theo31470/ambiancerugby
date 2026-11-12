import { cache } from "react";
import { publicClient } from "@/lib/supabase/server";
import { TEAM_LITE } from "@/lib/queries";
import type { TeamLite } from "@/lib/types";

/**
 * Records et séries d'une compétition, sur toutes les saisons présentes dans la base
 * (cinq saisons d'historique + la saison en cours).
 */
type MatchRec = { id: string; kickoff_at: string; season: string; round: string | null; home_score: number; away_score: number; home: TeamLite; away: TeamLite };
export type LigneMatch = MatchRec & { valeur: number };
export type Serie = { team: TeamLite; n: number; debut: string; fin: string; enCours: boolean };
export type LigneSaison = { team: TeamLite; season: string; valeur: number; joues: number };
type Joueur = { id: string; slug: string; first_name: string; last_name: string; photo_url: string | null };
export type LigneJoueur = { joueur: Joueur; valeur: number; season?: string; match?: MatchRec; team?: TeamLite | null };

export type Records = {
  saisons: string[];
  matchs: number;
  plusLarges: LigneMatch[];
  plusProlifiques: LigneMatch[];
  plusGrosScores: (LigneMatch & { cote: "home" | "away" })[];
  seriesVictoires: Serie[];
  invincibiliteDomicile: Serie[];
  attaques: LigneSaison[];
  defenses: LigneSaison[];
  essaisSaison: LigneJoueur[];
  pointsSaison: LigneJoueur[];
  essaisTotal: LigneJoueur[];
  essaisMatch: LigneJoueur[];
  pointsMatch: LigneJoueur[];
  plaquagesMatch: LigneJoueur[];
};

/** Toutes les lignes d'une requête, par pages de 1 000 (limite de l'API). */
async function tout<T>(requete: (de: number, a: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data } = await requete(de, de + 999);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const MATCH_REC = `id,kickoff_at,season,round,home_score,away_score, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE})`;
const JOUEUR = "id,slug,first_name,last_name,photo_url";

/** Plus longues séries d'un type de résultat, par équipe (une ligne par équipe, sa meilleure série). */
function series(matchs: MatchRec[], ok: (m: MatchRec, cote: "home" | "away") => boolean | null, domicileSeulement = false): Serie[] {
  const parEquipe = new Map<string, { team: TeamLite; liste: { m: MatchRec; cote: "home" | "away" }[] }>();
  for (const m of matchs) for (const cote of ["home", "away"] as const) {
    if (domicileSeulement && cote === "away") continue;
    const t = m[cote];
    const e = parEquipe.get(t.id) ?? { team: t, liste: [] };
    e.liste.push({ m, cote });
    parEquipe.set(t.id, e);
  }
  const out: Serie[] = [];
  for (const { team, liste } of parEquipe.values()) {
    let meilleure: Serie | null = null;
    let n = 0, debut = "";
    liste.forEach(({ m, cote }, i) => {
      const r = ok(m, cote);
      if (r) { if (n === 0) debut = m.kickoff_at; n++; }
      if (r && (!meilleure || n > meilleure.n)) meilleure = { team, n, debut, fin: m.kickoff_at, enCours: i === liste.length - 1 };
      if (!r) n = 0;
    });
    if (meilleure) out.push(meilleure);
  }
  return out.sort((a, b) => b.n - a.n || b.fin.localeCompare(a.fin));
}

export const getRecords = cache(async (competitionId: string): Promise<Records> => {
  const db = publicClient();
  const avecComp = (q: ReturnType<ReturnType<typeof db.from>["select"]>) => q.eq("match.competition_id", competitionId);
  const [matchsBruts, standings, totaux, essaisMatch, pointsMatch, plaquagesMatch] = await Promise.all([
    tout<MatchRec>((de, a) => db.from("matches").select(MATCH_REC).eq("competition_id", competitionId).eq("status", "finished")
      .not("home_score", "is", null).not("away_score", "is", null).order("kickoff_at").range(de, a)),
    tout<{ season: string; points_for: number | null; points_against: number | null; played: number; team: TeamLite; pool: string | null }>((de, a) =>
      db.from("standings").select(`season,points_for,points_against,played,pool, team:teams(${TEAM_LITE})`).eq("competition_id", competitionId).range(de, a)),
    tout<{ player_id: string; season: string; tries: number; points: number }>((de, a) =>
      db.from("player_season_totals").select("player_id,season,tries,points").eq("competition_id", competitionId).or("tries.gt.0,points.gt.0").range(de, a)),
    avecComp(db.from("player_match_stats").select(`tries, team:teams(${TEAM_LITE}), player:players(${JOUEUR}), match:matches!inner(${MATCH_REC},competition_id)`))
      .gte("tries", 3).order("tries", { ascending: false }).limit(10),
    avecComp(db.from("player_match_stats").select(`points, team:teams(${TEAM_LITE}), player:players(${JOUEUR}), match:matches!inner(${MATCH_REC},competition_id)`))
      .gte("points", 20).order("points", { ascending: false }).limit(10),
    avecComp(db.from("player_match_stats").select(`tackles, team:teams(${TEAM_LITE}), player:players(${JOUEUR}), match:matches!inner(${MATCH_REC},competition_id)`))
      .gte("tackles", 15).order("tackles", { ascending: false }).limit(10),
  ]);
  const matchs = matchsBruts.filter((m) => m.home && m.away);

  const avec = (f: (m: MatchRec) => number) => matchs.map((m) => ({ ...m, valeur: f(m) }));
  const plusLarges = avec((m) => Math.abs(m.home_score - m.away_score)).sort((a, b) => b.valeur - a.valeur).slice(0, 5);
  const plusProlifiques = avec((m) => m.home_score + m.away_score).sort((a, b) => b.valeur - a.valeur).slice(0, 5);
  const plusGrosScores = matchs.flatMap((m) => [{ ...m, valeur: m.home_score, cote: "home" as const }, { ...m, valeur: m.away_score, cote: "away" as const }])
    .sort((a, b) => b.valeur - a.valeur).slice(0, 5);
  const gagne = (m: MatchRec, c: "home" | "away") => (c === "home" ? m.home_score > m.away_score : m.away_score > m.home_score);
  const seriesVictoires = series(matchs, gagne).slice(0, 5);
  const invincibiliteDomicile = series(matchs, (m) => m.home_score >= m.away_score, true).slice(0, 5);

  // saisons complètes de phase régulière seulement (au moins 10 matchs joués)
  const regul = standings.filter((s) => s.team && s.played >= 10 && s.points_for != null && s.points_against != null);
  const attaques = regul.map((s) => ({ team: s.team, season: s.season, valeur: s.points_for!, joues: s.played })).sort((a, b) => b.valeur / b.joues - a.valeur / a.joues).slice(0, 5);
  const defenses = regul.map((s) => ({ team: s.team, season: s.season, valeur: s.points_against!, joues: s.played })).sort((a, b) => a.valeur / a.joues - b.valeur / b.joues).slice(0, 5);

  // joueurs : fiches des meilleurs seulement
  const topSaison = (k: "tries" | "points") => [...totaux].sort((a, b) => b[k] - a[k]).slice(0, 10);
  const cumul = new Map<string, number>();
  for (const t of totaux) cumul.set(t.player_id, (cumul.get(t.player_id) ?? 0) + (t.tries || 0));
  const topTotal = [...cumul.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ids = [...new Set([...topSaison("tries"), ...topSaison("points")].map((t) => t.player_id).concat(topTotal.map(([id]) => id)))];
  const { data: fiches } = ids.length ? await db.from("players").select(JOUEUR).in("id", ids) : { data: [] };
  const fiche = new Map(((fiches ?? []) as Joueur[]).map((p) => [p.id, p]));
  const enLigne = (l: { player_id: string; season: string; tries: number; points: number }[], k: "tries" | "points") =>
    l.filter((t) => fiche.has(t.player_id) && t[k] > 0).map((t) => ({ joueur: fiche.get(t.player_id)!, valeur: t[k], season: t.season }));

  type LM = { tries?: number; points?: number; tackles?: number; team: TeamLite | null; player: Joueur | null; match: MatchRec };
  const parMatch = (rows: unknown[] | null, k: "tries" | "points" | "tackles") => ((rows ?? []) as LM[])
    .filter((r) => r.player && r.match).map((r) => ({ joueur: r.player!, valeur: Number(r[k]), match: r.match, team: r.team }));

  return {
    saisons: [...new Set(matchs.map((m) => m.season))].sort().reverse(),
    matchs: matchs.length,
    plusLarges, plusProlifiques, plusGrosScores, seriesVictoires, invincibiliteDomicile, attaques, defenses,
    essaisSaison: enLigne(topSaison("tries"), "tries"),
    pointsSaison: enLigne(topSaison("points"), "points"),
    essaisTotal: topTotal.filter(([id, n]) => fiche.has(id) && n > 0).map(([id, n]) => ({ joueur: fiche.get(id)!, valeur: n })),
    essaisMatch: parMatch(essaisMatch.data, "tries"),
    pointsMatch: parMatch(pointsMatch.data, "points"),
    plaquagesMatch: parMatch(plaquagesMatch.data, "tackles"),
  };
});
