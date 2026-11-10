import type { SupabaseClient } from "@supabase/supabase-js";
import { publicClient } from "./supabase/server";
import type { Article, Competition, MatchFull, Player, StandingRow, Team } from "./types";
import { parisDayRange } from "./format";

export const TEAM_LITE = "id,slug,name,short_name,abbreviation,logo_url,color";
export const MATCH_SELECT = `*, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE}), competition:competitions(id,slug,name,short_name,color,logo_url)`;

export async function getCompetitions(opts: { all?: boolean } = {}): Promise<Competition[]> {
  let q = publicClient().from("competitions").select("*").order("sort_order");
  if (!opts.all) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []) as Competition[];
}

export async function getCompetition(slug: string): Promise<Competition | null> {
  const { data } = await publicClient().from("competitions").select("*").eq("slug", slug).maybeSingle();
  return data as Competition | null;
}

/** Matchs d'une journée (heure de Paris), triés par compétition puis horaire. */
export async function getMatchesOfDay(day: string, competitionId?: string): Promise<MatchFull[]> {
  const { start, end } = parisDayRange(day);
  let q = publicClient().from("matches").select(MATCH_SELECT).gte("kickoff_at", start).lt("kickoff_at", end).order("kickoff_at");
  if (competitionId) q = q.eq("competition_id", competitionId);
  const { data } = await q;
  return (data ?? []) as unknown as MatchFull[];
}

/** Bandeau : matchs en direct + autour de maintenant (derniers résultats et prochains). */
/**
 * Bandeau des scores : les matchs en direct, puis ceux qui commencent dans les 24 h, puis les derniers résultats,
 * puis les prochaines affiches. Hors direct, seules les grandes compétitions (et la Pro D2) y figurent.
 */
export async function getTickerMatches(): Promise<MatchFull[]> {
  const db = publicClient();
  const now = Date.now();
  const sel = MATCH_SELECT.replace("competition:competitions(", "competition:competitions(niveau,");
  const [live, recent, next] = await Promise.all([
    db.from("matches").select(MATCH_SELECT).in("status", ["live", "halftime"]).order("kickoff_at"),
    db.from("matches").select(sel).eq("status", "finished").gte("kickoff_at", new Date(now - 3 * 86400e3).toISOString()).order("kickoff_at", { ascending: false }).limit(80),
    db.from("matches").select(sel).eq("status", "scheduled").gte("kickoff_at", new Date(now - 3 * 3600e3).toISOString()).lte("kickoff_at", new Date(now + 6 * 86400e3).toISOString()).order("kickoff_at").limit(80),
  ]);
  // hors direct : compétitions élite, Pro D2 et Challenge Cup
  const grande = (m: MatchFull) => { const c = m.competition as MatchFull["competition"] & { niveau?: number }; return (c.niveau ?? 0) >= 1500 || ["pro-d2", "challenge-cup"].includes(c.slug); };
  const prochains = ((next.data ?? []) as unknown as MatchFull[]).filter(grande);
  const bientot = prochains.filter((m) => new Date(m.kickoff_at).getTime() < now + 86400e3);
  const plusTard = prochains.filter((m) => new Date(m.kickoff_at).getTime() >= now + 86400e3).slice(0, 10);
  const resultats = ((recent.data ?? []) as unknown as MatchFull[]).filter(grande).slice(0, 12);
  const list = [...((live.data ?? []) as unknown as MatchFull[]), ...bientot, ...resultats, ...plusTard];
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))).slice(0, 22);
}

export async function getMatch(id: string): Promise<MatchFull | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await publicClient().from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  return data as unknown as MatchFull | null;
}

export async function getCompetitionMatches(competitionId: string, season: string, opts: { upcoming?: boolean; limit?: number } = {}) {
  let q = publicClient().from("matches").select(MATCH_SELECT).eq("competition_id", competitionId).eq("season", season);
  if (opts.upcoming === true) q = q.in("status", ["scheduled", "live", "halftime", "postponed"]).order("kickoff_at");
  else if (opts.upcoming === false) q = q.eq("status", "finished").order("kickoff_at", { ascending: false });
  else q = q.order("kickoff_at");
  const { data } = await q.limit(opts.limit ?? 400);
  return (data ?? []) as unknown as MatchFull[];
}

export async function getTeamMatches(teamId: string, opts: { upcoming: boolean; limit: number }) {
  let q = publicClient().from("matches").select(MATCH_SELECT).or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  q = opts.upcoming
    ? q.in("status", ["scheduled", "live", "halftime"]).order("kickoff_at")
    : q.eq("status", "finished").order("kickoff_at", { ascending: false });
  const { data } = await q.limit(opts.limit);
  return (data ?? []) as unknown as MatchFull[];
}

export async function getStandings(competitionId: string, season: string): Promise<StandingRow[]> {
  const { data } = await publicClient()
    .from("standings")
    .select(`pool,rank,played,won,drawn,lost,points_for,points_against,tries_for,tries_against,bonus,points,form, team:teams(${TEAM_LITE})`)
    .eq("competition_id", competitionId)
    .eq("season", season)
    .order("pool")
    .order("rank");
  return (data ?? []) as unknown as StandingRow[];
}

export async function getSeasons(competitionId: string): Promise<string[]> {
  const { data } = await publicClient().from("team_competitions").select("season").eq("competition_id", competitionId);
  return [...new Set((data ?? []).map((r) => r.season as string))].sort().reverse();
}

export async function getCompetitionTeams(competitionId: string, season: string): Promise<Team[]> {
  const { data } = await publicClient().from("team_competitions").select("team:teams(*)").eq("competition_id", competitionId).eq("season", season);
  return ((data ?? []).map((r) => r.team) as unknown as Team[]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getTeam(slug: string): Promise<Team | null> {
  const { data } = await publicClient().from("teams").select("*").eq("slug", slug).maybeSingle();
  return data as Team | null;
}

export async function getTeamCompetitions(teamId: string) {
  const { data } = await publicClient().from("team_competitions").select("season, competition:competitions(*)").eq("team_id", teamId);
  return (data ?? []) as unknown as { season: string; competition: Competition }[];
}

export async function getSquad(teamId: string): Promise<Player[]> {
  const { data } = await publicClient().from("players").select("*").eq("team_id", teamId).eq("in_squad", true).order("last_name");
  return (data ?? []) as Player[];
}

export async function getPlayer(slug: string) {
  const { data } = await publicClient().from("players").select(`*, team:teams(${TEAM_LITE})`).eq("slug", slug).maybeSingle();
  return data as (Player & { team: Team | null }) | null;
}

export async function searchPlayers(q: string, position?: string, limit = 60) {
  let query = publicClient().from("players").select(`*, team:teams(${TEAM_LITE})`).eq("in_squad", true).order("last_name").limit(limit);
  if (q) query = query.or(`last_name.ilike.%${q.replace(/[%,()]/g, "")}%,first_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (position) query = query.eq("position", position);
  const { data } = await query;
  return (data ?? []) as unknown as (Player & { team: Team | null })[];
}

export const ARTICLE_LIST = "id,slug,title,excerpt,cover_url,category,published_at,team_id,competition_id,premium";

export async function getArticles(opts: { limit?: number; category?: string; teamId?: string; competitionId?: string } = {}) {
  let q = publicClient().from("articles").select(ARTICLE_LIST).eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.teamId) q = q.eq("team_id", opts.teamId);
  if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
  const { data } = await q.limit(opts.limit ?? 20);
  return (data ?? []) as Article[];
}

/** Article publié, avec son texte seulement si le lecteur y a droit (articles exclusifs). */
export async function getArticle(slug: string, supabase?: SupabaseClient) {
  const db = supabase ?? publicClient();
  const { data } = await db
    .from("articles")
    .select(`${ARTICLE_LIST},status,author_id,created_at,updated_at, author:profiles(display_name), team:teams(${TEAM_LITE}), competition:competitions(slug,name)`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const { data: body } = await db.rpc("get_article_body", { p_slug: slug });
  const b = (body ?? [])[0] as { content: string; locked: boolean } | undefined;
  return { ...(data as object), content: b?.content ?? "", locked: b?.locked ?? false } as Article & {
    locked: boolean;
    author: { display_name: string | null } | null;
    team: Team | null;
    competition: { slug: string; name: string } | null;
  };
}

export async function getComments(target: { articleId?: string; matchId?: string }) {
  let q = publicClient().from("comments").select("id,body,created_at,user_id, author:profiles(display_name,username,avatar_url,plan,plan_until)").order("created_at");
  q = target.articleId ? q.eq("article_id", target.articleId) : q.eq("match_id", target.matchId!);
  const { data } = await q.limit(300);
  return (data ?? []) as unknown as { id: string; body: string; created_at: string; user_id: string; author: { display_name: string | null; username: string | null; avatar_url: string | null; plan: string; plan_until: string | null } | null }[];
}

/** Groupe une liste de matchs par compétition, dans l'ordre d'affichage des compétitions. */
export function groupByCompetition(matches: MatchFull[]) {
  const groups = new Map<string, { competition: MatchFull["competition"]; matches: MatchFull[] }>();
  for (const m of matches) {
    const g = groups.get(m.competition.id) ?? { competition: m.competition, matches: [] };
    g.matches.push(m);
    groups.set(m.competition.id, g);
  }
  return [...groups.values()];
}
