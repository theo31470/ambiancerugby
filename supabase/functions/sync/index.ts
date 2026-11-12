// Ambiance Rugby — synchronisation API-Sports Rugby -> Supabase.
// Tâches (appelées par pg_cron ou depuis l'admin via trigger_sync) :
//   daily        compétitions, saisons, clubs + logos, calendriers/résultats, classements, confrontations
//   competition  même chose pour une seule compétition (params.slug)
//   live         scores du jour, toutes les 2 minutes quand un match est en cours
//   stats        statistiques d'équipe, par lots (curseur) pour rester sous les limites
//   history      saisons passées (matchs + classement final), params.saisons = profondeur
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const BASE = "https://v1.rugby.api-sports.io";
const DAILY_CAP = 7000; // plan PRO : 7 500 / jour, on garde une marge
const TIME_BUDGET_MS = 120_000;

type Team = { id: string; slug: string; name: string; short_name: string | null; aliases: string[]; apisports_id: number | null; logo_url: string | null; stadium: string | null; founded: number | null; country: string | null };
type Competition = { id: string; slug: string; name: string; short_name?: string | null; kind: string; current_season: string; standings_mode: string; apisports_id: number | null; apisports_season: number | null; active: boolean; logo_url: string | null };
type ApiSeason = { season: number; current: boolean; start: string; end: string };

const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => norm(s).replace(/ /g, "-");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

class Api {
  used = 0;
  last = 0;
  constructor(private key: string, private remaining: number) {}
  async get(path: string) {
    if (this.remaining - this.used <= 0) throw new Error("quota du jour atteint");
    // ~4 requêtes / seconde maximum (limite : 300 / minute)
    const wait = 250 - (Date.now() - this.last);
    if (wait > 0) await sleep(wait);
    for (let essai = 0; essai < 3; essai++) {
      this.last = Date.now();
      this.used++;
      const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": this.key } });
      if (res.status >= 500) { await sleep(2000); continue; }
      const body = await res.json();
      const errs = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
      if (errs?.length) {
        if (JSON.stringify(body.errors).includes("rateLimit") || JSON.stringify(body.errors).includes("Too many")) { await sleep(5000); continue; }
        throw new Error(`${path} : ${errs.join(" / ")}`);
      }
      return body.response;
    }
    throw new Error(`${path} : serveur API-Sports indisponible`);
  }
}

// ---------- saisons ----------
function choisirSaison(seasons: ApiSeason[]): ApiSeason | null {
  if (!seasons?.length) return null;
  const cur = seasons.find((s) => s.current);
  if (cur) return cur;
  const horizon = Date.now() + 120 * 86400e3;
  const cands = seasons.filter((s) => new Date(s.start).getTime() <= horizon).sort((a, b) => b.season - a.season);
  return cands[0] ?? seasons.sort((a, b) => b.season - a.season)[0];
}
function libelleSaison(s: ApiSeason) {
  const a = new Date(s.start), b = new Date(s.end);
  const mois = (b.getTime() - a.getTime()) / (30.4 * 86400e3);
  return b.getUTCFullYear() > a.getUTCFullYear() && mois < 13 && a.getUTCMonth() >= 6 ? `${a.getUTCFullYear()}-${a.getUTCFullYear() + 1}` : String(s.season);
}

// ---------- statuts ----------
function statut(short: string) {
  if (["FT", "AET", "PEN", "AW"].includes(short)) return "finished";
  if (short === "HT" || short === "BT") return "halftime";
  if (["1H", "2H", "ET", "PT"].includes(short)) return "live";
  if (short === "POST" || short === "INTR" || short === "SUSP") return "postponed";
  if (short === "CANC" || short === "ABD") return "cancelled";
  return "scheduled";
}
const HORLOGE: Record<string, string> = { "1H": "1re mi-temps", "2H": "2e mi-temps", ET: "Prolongation", PT: "Tirs au but", BT: "Pause" };

// ---------- clubs ----------
class TeamIndex {
  byApi = new Map<number, Team>();
  byName = new Map<string, Team>();
  slugs = new Set<string>();
  constructor(private db: SupabaseClient, teams: Team[]) { teams.forEach((t) => this.add(t)); }
  add(t: Team) {
    if (t.apisports_id) this.byApi.set(t.apisports_id, t);
    this.slugs.add(t.slug);
    for (const n of [t.name, t.short_name, ...(t.aliases ?? [])]) if (n) this.byName.set(norm(n), t);
  }
  private match(name: string) {
    const n = norm(name);
    return this.byName.get(n) ?? this.byName.get(n.replace(/\b(rugby|club|fc|rc|us|as)\b/g, " ").replace(/\s+/g, " ").trim());
  }
  async resolve(apiId: number, name: string, extra: { logo?: string | null; national?: boolean; founded?: number | null; stadium?: string | null; country?: string | null } = {}): Promise<Team> {
    let t = this.byApi.get(apiId) ?? this.match(name);
    const patch: Record<string, unknown> = {};
    if (t) {
      if (!t.apisports_id) patch.apisports_id = apiId;
      // logo : on garde un logo personnalisé envoyé par la rédaction
      if (extra.logo && (!t.logo_url || t.logo_url.includes("api-sports.io")) && t.logo_url !== extra.logo) patch.logo_url = extra.logo;
      if (!t.stadium && extra.stadium) patch.stadium = extra.stadium;
      if (!t.founded && extra.founded) patch.founded = extra.founded;
      if (Object.keys(patch).length) {
        const { data, error } = await this.db.from("teams").update(patch).eq("id", t.id).select().single();
        if (error) throw error;
        t = data as Team;
        this.add(t);
      }
      return t;
    }
    let slug = slugify(name) || `equipe-${apiId}`;
    let i = 2;
    while (this.slugs.has(slug)) slug = `${slugify(name)}-${i++}`;
    const { data, error } = await this.db.from("teams").insert({
      slug, name, short_name: name, aliases: [name], logo_url: extra.logo ?? null, is_national: extra.national ?? false,
      apisports_id: apiId, founded: extra.founded ?? null, stadium: extra.stadium ?? null, country: extra.country ?? null,
    }).select().single();
    if (error) throw error;
    this.add(data as Team);
    return data as Team;
  }
}

// ---------- briques ----------
async function syncCompetitions(db: SupabaseClient, api: Api, comps: Competition[]) {
  const leagues = await api.get("/leagues");
  for (const c of comps) {
    const l = (leagues ?? []).find((x: { id: number }) => x.id === c.apisports_id);
    if (!l) continue;
    const s = choisirSaison(l.seasons);
    if (!s) continue;
    const patch = { apisports_season: s.season, current_season: libelleSaison(s), logo_url: l.logo ?? c.logo_url };
    await db.from("competitions").update(patch).eq("id", c.id);
    Object.assign(c, patch);
  }
  return leagues as { id: number; seasons: ApiSeason[] }[];
}

async function syncTeams(db: SupabaseClient, api: Api, c: Competition, idx: TeamIndex, season = c.apisports_season!, label = c.current_season) {
  const teams = await api.get(`/teams?league=${c.apisports_id}&season=${season}`);
  const links = [];
  for (const t of teams ?? []) {
    const team = await idx.resolve(t.id, t.name ?? `Équipe ${t.id}`, { logo: t.logo, national: t.national, founded: t.founded, stadium: t.arena?.name ?? null, country: t.country?.name ?? null });
    links.push({ team_id: team.id, competition_id: c.id, season: label });
  }
  if (links.length) await db.from("team_competitions").upsert(links, { onConflict: "team_id,competition_id,season", ignoreDuplicates: true });
  return links.length;
}

type GameRow = Record<string, unknown> & { external_id: string };

async function gameRow(g: any, c: Competition, label: string, idx: TeamIndex): Promise<GameRow> {
  const national = c.kind === "international";
  const home = await idx.resolve(g.teams.home.id, g.teams.home.name ?? `Équipe ${g.teams.home.id}`, { logo: g.teams.home.logo, national });
  const away = await idx.resolve(g.teams.away.id, g.teams.away.name ?? `Équipe ${g.teams.away.id}`, { logo: g.teams.away.logo, national });
  const st = statut(g.status?.short ?? "NS");
  const p = g.periods ?? {};
  const lines = [p.first, p.second, p.overtime].filter((x: any) => x && (x.home != null || x.away != null)).map((x: any) => ({ home: x.home ?? 0, away: x.away ?? 0 }));
  return {
    competition_id: c.id, season: label, round: g.week ? String(g.week).replace(/^Regular Season - /i, "") : null,
    kickoff_at: g.date, home_team_id: home.id, away_team_id: away.id,
    home_score: st === "scheduled" ? null : g.scores?.home ?? null, away_score: st === "scheduled" ? null : g.scores?.away ?? null,
    status: st, clock: st === "live" ? HORLOGE[g.status?.short] ?? null : null,
    linescores: lines.length ? lines : null, source: "apisports", external_id: String(g.id),
  };
}

/** N'écrit que les matchs nouveaux ou modifiés (évite d'inonder le temps réel). */
async function upsertGames(db: SupabaseClient, rows: GameRow[]) {
  if (!rows.length) return { changed: 0, finished: [] as string[] };
  const ids = rows.map((r) => r.external_id);
  const existing = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("matches").select("external_id,status,home_score,away_score,kickoff_at,clock,round,home_team_id,away_team_id,season").eq("source", "apisports").in("external_id", ids.slice(i, i + 300));
    for (const m of data ?? []) existing.set(m.external_id as string, m);
  }
  const keys = ["status", "home_score", "away_score", "clock", "round", "home_team_id", "away_team_id", "season"];
  const changed = rows.filter((r) => {
    const e = existing.get(r.external_id);
    if (!e) return true;
    if (new Date(e.kickoff_at as string).getTime() !== new Date(r.kickoff_at as string).getTime()) return true;
    return keys.some((k) => (e[k] ?? null) !== (r[k] ?? null));
  });
  const finished = changed.filter((r) => r.status === "finished" && existing.get(r.external_id)?.status !== "finished").map((r) => r.competition_id as string);
  for (let i = 0; i < changed.length; i += 200) {
    const { error } = await db.from("matches").upsert(changed.slice(i, i + 200), { onConflict: "source,external_id" });
    if (error) throw error;
  }
  return { changed: changed.length, finished };
}

async function syncGames(db: SupabaseClient, api: Api, c: Competition, idx: TeamIndex, season = c.apisports_season!, label = c.current_season) {
  const games = await api.get(`/games?league=${c.apisports_id}&season=${season}`);
  const rows: GameRow[] = [];
  for (const g of games ?? []) rows.push(await gameRow(g, c, label, idx));
  const r = await upsertGames(db, rows);
  return { total: rows.length, changed: r.changed };
}

type Ligne = { team_id: string; pool: string; played: number; won: number; drawn: number; lost: number; pf: number; pa: number; bonus: number; points: number; res: { k: number; r: string }[] };

/** Classement calculé à partir de nos propres résultats (poules déduites des matchs joués entre équipes). */
async function classementCalcule(db: SupabaseClient, c: Competition, label = c.current_season) {
  const { data } = await db.from("matches").select("home_team_id,away_team_id,home_score,away_score,status,round,kickoff_at")
    .eq("competition_id", c.id).eq("season", label).limit(2000);
  let games = (data ?? []).filter((m) => m.round == null || /^\d+$/.test(String(m.round)));
  if (!games.length) return { rows: [] as Ligne[], teams: 0 };
  const maxK = Math.max(...games.map((m) => new Date(m.kickoff_at).getTime()));
  games = games.filter((m) => new Date(m.kickoff_at).getTime() >= maxK - 300 * 86400e3);
  // poules : composantes connexes du graphe des matchs de phase régulière
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  for (const m of games) { parent.set(m.home_team_id, find(m.home_team_id)); parent.set(m.away_team_id, find(m.away_team_id)); parent.set(find(m.home_team_id), find(m.away_team_id)); }
  const comps = new Map<string, string[]>();
  for (const t of parent.keys()) comps.set(find(t), [...(comps.get(find(t)) ?? []), t]);
  const premier = new Map<string, number>();
  for (const m of games) { const r = find(m.home_team_id); premier.set(r, Math.min(premier.get(r) ?? Infinity, new Date(m.kickoff_at).getTime())); }
  const groupes = [...comps.keys()].sort((x, y) => (premier.get(x)! - premier.get(y)!) || x.localeCompare(y));
  const multi = groupes.length > 1;
  const nomPoule = new Map(groupes.map((g, i) => [g, multi ? `Poule ${String.fromCharCode(65 + i)}` : ""]));
  const seuilBD = ["top-14", "pro-d2", "nationale"].includes(c.slug) ? 5 : 7;
  const tab = new Map<string, Ligne>();
  const get = (id: string) => tab.get(id) ?? (tab.set(id, { team_id: id, pool: nomPoule.get(find(id))!, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, bonus: 0, points: 0, res: [] }), tab.get(id)!);
  for (const m of games) {
    get(m.home_team_id); get(m.away_team_id);
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) continue;
    const k = new Date(m.kickoff_at).getTime();
    for (const [id, pf, pa] of [[m.home_team_id, m.home_score, m.away_score], [m.away_team_id, m.away_score, m.home_score]] as [string, number, number][]) {
      const l = get(id);
      l.played++; l.pf += pf; l.pa += pa;
      if (pf > pa) { l.won++; l.points += 4; l.res.push({ k, r: "V" }); }
      else if (pf === pa) { l.drawn++; l.points += 2; l.res.push({ k, r: "N" }); }
      else { l.lost++; l.res.push({ k, r: "D" }); if (pa - pf <= seuilBD) { l.bonus++; l.points++; } }
    }
  }
  return { rows: [...tab.values()], teams: tab.size };
}

async function syncStandings(db: SupabaseClient, api: Api, c: Competition, idx: TeamIndex, season = c.apisports_season, label = c.current_season) {
  if (c.standings_mode === "none") return 0;
  const calc = await classementCalcule(db, c, label);
  const now = new Date().toISOString();
  type Row = Record<string, unknown> & { team_id: string; pool: string; points: number; pf: number; pa: number };
  let rows: Row[] = [];
  let source = "calcul";

  if (c.standings_mode === "api") {
    const groups = await api.get(`/standings?league=${c.apisports_id}&season=${season}`);
    const flat: any[] = Array.isArray(groups) ? groups.flat(2).filter((r: any) => r?.team?.id) : [];
    if (flat.length) {
      const multi = new Set(flat.map((r) => r.group?.name ?? "")).size > 1;
      const seen = new Set<string>();
      const apiRows: Row[] = [];
      for (const r of flat) {
        const team = await idx.resolve(r.team.id, r.team.name ?? `Équipe ${r.team.id}`, { logo: r.team.logo, national: c.kind === "international" });
        if (seen.has(team.id)) continue;
        seen.add(team.id);
        const w = r.games?.win?.total ?? 0, d = r.games?.draw?.total ?? 0;
        apiRows.push({
          team_id: team.id, pool: multi ? (r.group?.name ?? "") : "", played: r.games?.played ?? 0, won: w, drawn: d, lost: r.games?.lose?.total ?? 0,
          pf: r.goals?.for ?? 0, pa: r.goals?.against ?? 0, bonus: Math.max(0, (r.points ?? 0) - (4 * w + 2 * d)), points: r.points ?? 0,
          // forme API (W/D/L) en français (V/N/D)
          form: r.form ? String(r.form).replace(/D/g, "N").replace(/W/g, "V").replace(/L/g, "D").slice(-5) : null,
        });
      }
      // on garde le classement officiel seulement s'il colle à nos résultats (l'API est parfois en retard d'une saison)
      const byTeam = new Map(calc.rows.map((l) => [l.team_id, l]));
      const ok = apiRows.filter((r) => byTeam.get(r.team_id)?.played === r.played).length;
      if (apiRows.length >= calc.teams * 0.9 && ok >= apiRows.length * 0.85) { rows = apiRows; source = "api"; }
    }
  }
  if (source === "calcul") {
    rows = calc.rows.map((l) => ({
      team_id: l.team_id, pool: l.pool, played: l.played, won: l.won, drawn: l.drawn, lost: l.lost, pf: l.pf, pa: l.pa, bonus: l.bonus, points: l.points,
      form: l.res.length ? l.res.sort((a, b) => a.k - b.k).slice(-5).map((x) => x.r).join("") : null,
    }));
  }
  if (!rows.length) return 0;
  // rang dans chaque poule
  const pools = new Map<string, Row[]>();
  for (const r of rows) pools.set(r.pool, [...(pools.get(r.pool) ?? []), r]);
  const out: Record<string, unknown>[] = [];
  for (const list of pools.values()) {
    if (source === "calcul") list.sort((a, b) => b.points - a.points || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf);
    list.forEach((r, i) => out.push({
      competition_id: c.id, season: label, team_id: r.team_id, pool: r.pool, rank: i + 1,
      played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, points_for: r.pf, points_against: r.pa,
      tries_for: null, tries_against: null, bonus: r.bonus, points: r.points, form: r.form ?? null, updated_at: now,
    }));
  }
  await db.from("standings").delete().eq("competition_id", c.id).eq("season", label);
  const { error } = await db.from("standings").insert(out);
  if (error) throw error;
  if (label === c.current_season) await db.from("competitions").update({ standings_source: source }).eq("id", c.id);
  return out.length;
}

async function syncH2H(db: SupabaseClient, api: Api, limit: number) {
  const { data: upcoming } = await db.from("matches")
    .select("id, home:teams!matches_home_team_id_fkey(apisports_id), away:teams!matches_away_team_id_fkey(apisports_id), h2h:match_h2h(updated_at)")
    .eq("source", "apisports").eq("status", "scheduled")
    .gte("kickoff_at", new Date().toISOString()).lte("kickoff_at", new Date(Date.now() + 8 * 86400e3).toISOString())
    .order("kickoff_at").limit(120);
  let n = 0;
  for (const m of (upcoming ?? []) as any[]) {
    if (n >= limit) break;
    const fresh = m.h2h?.updated_at && Date.now() - new Date(m.h2h.updated_at).getTime() < 3 * 86400e3;
    if (fresh || !m.home?.apisports_id || !m.away?.apisports_id) continue;
    const games = await api.get(`/games/h2h?h2h=${m.home.apisports_id}-${m.away.apisports_id}`);
    const list = (games ?? []).filter((g: any) => statut(g.status?.short) === "finished")
      .sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 8)
      .map((g: any) => ({ date: g.date, league: g.league?.name, home: g.teams.home.name, away: g.teams.away.name, home_id: g.teams.home.id, away_id: g.teams.away.id, hs: g.scores.home, as: g.scores.away }));
    await db.from("match_h2h").upsert({ match_id: m.id, games: list, updated_at: new Date().toISOString() });
    n++;
  }
  return n;
}

async function syncCompetitionFull(db: SupabaseClient, api: Api, c: Competition, idx: TeamIndex) {
  const t0 = Date.now();
  const teams = await syncTeams(db, api, c, idx);
  const games = await syncGames(db, api, c, idx);
  const st = await syncStandings(db, api, c, idx);
  await db.from("competitions").update({ last_synced_at: new Date().toISOString() }).eq("id", c.id);
  return { msg: `${teams} équipes, ${games.total} matchs (${games.changed} mis à jour), ${st} au classement`, ms: Date.now() - t0 };
}

// ---------- handler ----------
Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: ok } = await db.rpc("check_sync_secret", { s: req.headers.get("x-sync-secret") ?? "" });
  if (!ok) return json({ error: "unauthorized" }, 401);

  const t0 = Date.now();
  const { job = "daily", params = {} } = await req.json().catch(() => ({}));
  const key = (Deno.env.get("APISPORTS_KEY") ?? "").trim();
  const log = async (ok: boolean, message: string, calls: number, competition_id: string | null = null) => {
    await db.from("sync_runs").insert({ provider: "apisports", job, calls, ok, message, competition_id, duration_ms: Date.now() - t0 });
  };
  if (!key) {
    await log(false, "Clé APISPORTS_KEY manquante", 0);
    return json({ error: "Clé APISPORTS_KEY manquante" }, 400);
  }

  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { data: used } = await db.from("sync_runs").select("calls").eq("provider", "apisports").gte("created_at", since.toISOString());
  const api = new Api(key, DAILY_CAP - (used ?? []).reduce((a, r) => a + (r.calls ?? 0), 0));

  const { data: compsData } = await db.from("competitions").select("*").not("apisports_id", "is", null).order("sort_order");
  const comps = ((compsData ?? []) as Competition[]).filter((c) => c.active);
  // tous les clubs (par pages : l'API Supabase s'arrête à 1 000 lignes par requête)
  const teams: Team[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await db.from("teams").select("id,slug,name,short_name,aliases,apisports_id,logo_url,stadium,founded,country").order("id").range(de, de + 999);
    teams.push(...((data ?? []) as Team[]));
    if (!data || data.length < 1000) break;
  }
  const idx = new TeamIndex(db, teams);
  const lignes: string[] = [];
  let okRun = true;

  try {
    if (job === "daily" || job === "competition") {
      await syncCompetitions(db, api, comps);
      const cibles = job === "competition" ? comps.filter((c) => c.slug === params.slug) : comps;
      if (job === "competition" && !cibles.length) throw new Error("Compétition inconnue ou désactivée");
      for (const c of cibles) {
        try {
          const r = await syncCompetitionFull(db, api, c, idx);
          lignes.push(`${c.short_name ?? c.name} : ${r.msg}`);
        } catch (e) {
          okRun = false;
          lignes.push(`${c.slug} : ERREUR ${(e as Error).message}`);
          if ((e as Error).message.includes("quota")) break;
        }
      }
      if (job === "daily") lignes.push(`${await syncH2H(db, api, 40)} confrontations`);
      else lignes.push(`${await syncH2H(db, api, 10)} confrontations`);
    }

    if (job === "live") {
      // les jours (UTC) concernés par un match en cours ou imminent
      const { data: fenetre } = await db.from("matches").select("kickoff_at,competition_id")
        .eq("source", "apisports")
        .or(`status.in.(live,halftime),and(status.eq.scheduled,kickoff_at.gte.${new Date(Date.now() - 3 * 3600e3).toISOString()},kickoff_at.lte.${new Date(Date.now() + 5 * 60e3).toISOString()})`);
      const jours = [...new Set((fenetre ?? []).map((m) => (m.kickoff_at as string).slice(0, 10)))];
      const byApi = new Map(comps.map((c) => [c.apisports_id!, c]));
      const finis = new Set<string>();
      let total = 0;
      for (const d of jours) {
        const games = await api.get(`/games?date=${d}&timezone=UTC`);
        const rows: GameRow[] = [];
        for (const g of games ?? []) {
          const c = byApi.get(g.league?.id);
          if (!c) continue;
          // le match du jour appartient à la saison suivie de la compétition
          if (g.league?.season && c.apisports_season && g.league.season !== c.apisports_season) continue;
          rows.push(await gameRow(g, c, c.current_season, idx));
        }
        const r = await upsertGames(db, rows);
        total += r.changed;
        r.finished.forEach((id) => finis.add(id));
      }
      for (const id of finis) {
        const c = comps.find((x) => x.id === id);
        if (c) await syncStandings(db, api, c, idx);
      }
      lignes.push(`${jours.length} jour(s), ${total} match(s) mis à jour${finis.size ? `, classements rafraîchis : ${finis.size}` : ""}`);
    }

    if (job === "stats") {
      // toutes les paires (compétition, club) de la saison en cours, traitées dans l'ordre avec un curseur
      const { data: links } = await db.from("team_competitions").select("team_id, competition_id, season, team:teams(apisports_id)");
      const pairs = ((links ?? []) as any[])
        .map((l) => ({ ...l, c: comps.find((c) => c.id === l.competition_id && c.current_season === l.season && c.standings_mode !== "none") }))
        .filter((l) => l.c && l.team?.apisports_id)
        .sort((a, b) => (a.c.slug + a.team_id).localeCompare(b.c.slug + b.team_id));
      const { data: cur } = await db.from("app_state").select("value").eq("key", "stats_cursor").maybeSingle();
      let i = Number(cur?.value ?? 0);
      let n = 0;
      while (i < pairs.length && Date.now() - t0 < TIME_BUDGET_MS) {
        const p = pairs[i];
        try {
          const s = await api.get(`/teams/statistics?league=${p.c.apisports_id}&season=${p.c.apisports_season}&team=${p.team.apisports_id}`);
          if (s?.games) {
            const g = s.games, pts = s.goals ?? {};
            await db.from("team_season_stats").upsert({
              team_id: p.team_id, competition_id: p.competition_id, season: p.season,
              played_home: g.played?.home, played_away: g.played?.away,
              wins_home: g.wins?.home?.total, wins_away: g.wins?.away?.total,
              draws_home: g.draws?.home?.total, draws_away: g.draws?.away?.total,
              losses_home: g.loses?.home?.total, losses_away: g.loses?.away?.total,
              pf_home: pts.for?.total?.home, pf_away: pts.for?.total?.away,
              pa_home: pts.against?.total?.home, pa_away: pts.against?.total?.away,
              raw: s, updated_at: new Date().toISOString(),
            });
          }
        } catch (e) {
          if ((e as Error).message.includes("quota")) break;
        }
        i++; n++;
      }
      const fini = i >= pairs.length;
      await db.from("app_state").upsert(fini ? [{ key: "stats_cursor", value: "0" }, { key: "stats_done_day", value: new Date().toISOString().slice(0, 10) }] : [{ key: "stats_cursor", value: String(i) }]);
      lignes.push(`${n} fiches de stats (${i}/${pairs.length})${fini ? ", passe terminée" : ", suite au prochain passage"}`);
    }

    if (job === "history") {
      // saisons passées : matchs + classement final. params.saisons = nombre de saisons en arrière (1 par défaut),
      // params.slug pour une seule compétition, params.force pour tout réimporter. Reprend là où il s'est arrêté.
      const n = Math.max(1, Math.min(8, Number(params.saisons) || 1));
      const leagues = await syncCompetitions(db, api, comps);
      let fini = true;
      for (const c of comps.filter((x) => !params.slug || x.slug === params.slug)) {
        const l = leagues.find((x) => x.id === c.apisports_id);
        const passees = (l?.seasons ?? []).filter((s) => s.season < c.apisports_season!).sort((a, b) => b.season - a.season).slice(0, n);
        for (const prev of passees) {
          if (Date.now() - t0 > TIME_BUDGET_MS) { fini = false; break; }
          const label = libelleSaison(prev);
          if (label === c.current_season) continue;
          try {
            const { count } = await db.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", c.id).eq("season", label);
            let msg = "";
            if ((count ?? 0) === 0 || params.force) {
              await syncTeams(db, api, c, idx, prev.season, label);
              const g = await syncGames(db, api, c, idx, prev.season, label);
              msg = `${g.total} matchs`;
            }
            const { count: cl } = await db.from("standings").select("team_id", { count: "exact", head: true }).eq("competition_id", c.id).eq("season", label);
            if (c.standings_mode !== "none" && ((cl ?? 0) === 0 || params.force)) msg += `${msg ? ", " : ""}${await syncStandings(db, api, c, idx, prev.season, label)} au classement`;
            if (msg) lignes.push(`${c.short_name ?? c.name} ${label} : ${msg}`);
          } catch (e) {
            okRun = false;
            lignes.push(`${c.slug} ${label} : ERREUR ${(e as Error).message}`);
          }
        }
        if (!fini) break;
      }
      lignes.push(fini ? "historique complet" : "temps écoulé, relancez pour finir");
    }
  } catch (e) {
    okRun = false;
    lignes.push(`ERREUR ${(e as Error).message}`);
  }

  if (api.used > 0 || !okRun) await log(okRun, lignes.join(" | "), api.used, job === "competition" ? comps.find((c) => c.slug === params.slug)?.id ?? null : null);
  return json({ ok: okRun, calls: api.used, log: lignes, ms: Date.now() - t0 }, okRun ? 200 : 500);
});
