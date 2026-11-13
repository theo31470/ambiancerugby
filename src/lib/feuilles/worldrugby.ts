import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stats détaillées officielles de World Rugby (API publique du match centre, données Opta) :
 * plaquages, courses, mètres, franchissements, ballons grattés… pour les tests internationaux
 * (et quelques championnats étrangers). Complète la feuille ESPN, qui n'a que la composition et les points.
 */
const API = "https://api.wr-rims-prod.pulselive.com/rugby/v3";
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// noms français des sélections → noms anglais de World Rugby
const EN: Record<string, string> = {
  "afrique du sud": "south africa", "nouvelle zelande": "new zealand", "angleterre": "england", "ecosse": "scotland", "irlande": "ireland",
  "pays de galles": "wales", "italie": "italy", "argentine": "argentina", "australie": "australia", "japon": "japan", "fidji": "fiji",
  "georgie": "georgia", "roumanie": "romania", "espagne": "spain", "uruguay": "uruguay", "chili": "chile", "etats unis": "usa",
  "canada": "canada", "tonga": "tonga", "samoa": "samoa", "portugal": "portugal", "namibie": "namibia", "allemagne": "germany",
  "belgique": "belgium", "pays bas": "netherlands", "russie": "russia", "zimbabwe": "zimbabwe", "kenya": "kenya", "bresil": "brazil",
  "hong kong": "hong kong china", "coree du sud": "korea", "france": "france",
};

type Equipe = { id: string; name: string; abbreviation?: string | null };
type Joueur = { player: { name?: { display?: string }; isPlayerOfTheMatch?: boolean; role?: string }; number: string | null; stats: Record<string, number> };
type Stats = { match: { matchId: string; teams: Equipe[]; scores: number[]; status: string }; teamStats: { playerStats: Joueur[] }[] };
type EquipeLocale = { name: string; short_name?: string | null; abbreviation?: string | null; aliases?: string[] | null };
export type MatchWr = { id: string; kickoff_at: string; home_team_id: string; away_team_id: string; home_score: number | null; away_score: number | null; home: EquipeLocale; away: EquipeLocale };

const noms = (t: EquipeLocale) => [t.name, t.short_name, ...(t.aliases ?? [])].map(norm).filter(Boolean).flatMap((n) => [n, EN[n] ?? n]);
const pareil = (wr: Equipe, t: EquipeLocale) => {
  const n = norm(wr.name), a = norm(wr.abbreviation);
  return noms(t).some((x) => x === n || n.startsWith(`${x} `) || x.startsWith(`${n} `)) || (!!a && a === norm(t.abbreviation));
};

async function lire<T>(chemin: string): Promise<T | null> {
  const r = await fetch(`${API}${chemin}`, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "AmbianceRugby/1.0", accept: "application/json" } }).catch(() => null);
  return r?.ok ? ((await r.json()) as T) : null;
}

/** Retrouve le match World Rugby (même jour, mêmes équipes) et renvoie aussi le sens domicile / extérieur. */
async function trouver(m: MatchWr): Promise<{ id: string; inverse: boolean } | null> {
  const jour = new Date(m.kickoff_at);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const veille = new Date(jour.getTime() - 86400e3), lendemain = new Date(jour.getTime() + 86400e3);
  for (let page = 0; page < 4; page++) {
    const r = await lire<{ content?: { matchId: string; teams: Equipe[] }[]; pageInfo?: { numPages?: number } }>(`/match?startDate=${d(veille)}&endDate=${d(lendemain)}&sort=asc&pageSize=100&page=${page}`);
    for (const x of r?.content ?? []) {
      const [t0, t1] = x.teams ?? [];
      if (!t0 || !t1) continue;
      if (pareil(t0, m.home) && pareil(t1, m.away)) return { id: x.matchId, inverse: false };
      if (pareil(t0, m.away) && pareil(t1, m.home)) return { id: x.matchId, inverse: true };
    }
    if (!r || (r.pageInfo?.numPages ?? 1) <= page + 1) break;
  }
  return null;
}

export type ResultatWr = { ok: true; joueurs: number; hommeDuMatch: boolean } | { ok: false; raison: string };

/**
 * Ajoute les stats détaillées World Rugby aux lignes déjà présentes (feuille ESPN), en reconnaissant chaque joueur
 * par son équipe et son numéro de maillot. Les points et les essais restent ceux de la feuille (cohérents avec le score).
 */
export async function importerStatsWorldRugby(db: SupabaseClient, m: MatchWr): Promise<ResultatWr> {
  const cible = await trouver(m);
  if (!cible) return { ok: false, raison: "match introuvable chez World Rugby" };
  const s = await lire<Stats>(`/match/${cible.id}/stats`);
  if (!s?.teamStats?.length) return { ok: false, raison: "pas encore de stats chez World Rugby" };
  const equipes = cible.inverse ? [m.away_team_id, m.home_team_id] : [m.home_team_id, m.away_team_id];

  const { data: lignes } = await db.from("player_match_stats").select("player_id, team_id, numero").eq("match_id", m.id);
  const parNumero = new Map((lignes ?? []).filter((l) => l.numero != null).map((l) => [`${l.team_id}:${l.numero}`, l.player_id as string]));
  const n = (x: Record<string, number>, ...k: string[]) => Math.round(k.reduce((t, c) => t + (Number(x[c]) || 0), 0));

  let maj = 0, homme: string | null = null;
  for (let i = 0; i < Math.min(2, s.teamStats.length); i++) {
    for (const j of s.teamStats[i].playerStats ?? []) {
      if (j.player?.role && j.player.role !== "Player") continue;
      const pid = parNumero.get(`${equipes[i]}:${Number(j.number)}`);
      if (!pid) continue;
      if (j.player?.isPlayerOfTheMatch) homme = pid;
      const x = j.stats ?? {};
      if (!Object.keys(x).length) continue;
      const { error } = await db.from("player_match_stats").update({
        ...(x.MinutesPlayedTotal != null ? { minutes: n(x, "MinutesPlayedTotal") } : {}),
        tackles: n(x, "Tackles"), missed_tackles: n(x, "MissedTackles"), carries: n(x, "Carries"), metres: n(x, "Metres"),
        line_breaks: n(x, "CleanBreaks"), offloads: n(x, "Offload"), turnovers_won: n(x, "TurnoverWon"), penalties_conceded: n(x, "PenDefs", "PenOffs"),
      }).eq("match_id", m.id).eq("player_id", pid);
      if (!error) maj++;
    }
  }
  if (!maj) return { ok: false, raison: "joueurs World Rugby non reconnus" };
  // l'homme du match officiel n'est renseigné qu'après coup : on ne remplace pas un choix fait au studio
  if (homme) await db.from("matches").update({ homme_du_match: homme }).eq("id", m.id).is("homme_du_match", null);
  await db.rpc("noter_matchs", { p_matchs: [m.id] });
  return { ok: true, joueurs: maj, hommeDuMatch: !!homme };
}
