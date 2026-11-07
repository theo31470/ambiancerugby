// Ambiance Rugby — synchronisation des données (Oanor + API-Sports) vers Supabase.
// Appelée par pg_cron (jobs daily / live / teams) ou depuis l'admin (trigger_sync).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const OANOR_BASE = "https://api.oanor.com/rugby-api/v1";
const APISPORTS_BASE = "https://v1.rugby.api-sports.io";
const OANOR_MONTHLY_CAP = 2800; // offre gratuite : 3000 appels / mois
const APISPORTS_DAILY_CAP = 95; // offre gratuite : 100 appels / jour

type Team = {
  id: string; slug: string; name: string; short_name: string | null; abbreviation: string | null;
  aliases: string[]; city: string | null; oanor_id: string | null; apisports_id: number | null; logo_url: string | null;
};
type Competition = {
  id: string; slug: string; name: string; current_season: string; standings_mode: string;
  oanor_id: string | null; apisports_id: number | null; apisports_name: string | null; kind: string;
};

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => norm(s).replace(/ /g, "-");

class Budget {
  used = 0;
  constructor(public remaining: number) {}
  take() { if (this.remaining <= 0) throw new Error("quota atteint"); this.remaining--; this.used++; }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// ---------- team resolution ----------
class TeamIndex {
  byOanor = new Map<string, Team>();
  byApi = new Map<number, Team>();
  byName = new Map<string, Team>();
  slugs = new Set<string>();
  constructor(private db: SupabaseClient, teams: Team[]) { teams.forEach((t) => this.add(t)); }
  add(t: Team) {
    if (t.oanor_id) this.byOanor.set(t.oanor_id, t);
    if (t.apisports_id) this.byApi.set(t.apisports_id, t);
    this.slugs.add(t.slug);
    for (const n of [t.name, t.short_name, ...(t.aliases ?? [])]) if (n) this.byName.set(norm(n), t);
  }
  private match(name: string): Team | undefined {
    const n = norm(name);
    if (this.byName.has(n)) return this.byName.get(n);
    // "Stade Toulousain Rugby" / "Toulouse Rugby"… : on retire les mots génériques
    const stripped = n.replace(/\b(rugby|club|fc|rc|us|as)\b/g, " ").replace(/\s+/g, " ").trim();
    return this.byName.get(stripped);
  }
  async resolve(src: "oanor" | "apisports", extId: string | number, name: string, extra: { logo?: string | null; color?: string | null; abbreviation?: string | null; national?: boolean } = {}): Promise<Team> {
    const existing = src === "oanor" ? this.byOanor.get(String(extId)) : this.byApi.get(Number(extId));
    if (existing) return existing;
    const found = this.match(name);
    if (found) {
      const patch: Record<string, unknown> = src === "oanor" ? { oanor_id: String(extId) } : { apisports_id: Number(extId) };
      if (!found.logo_url && extra.logo) patch.logo_url = extra.logo;
      const { data, error } = await this.db.from("teams").update(patch).eq("id", found.id).select().single();
      if (error) throw error;
      this.add(data as Team);
      return data as Team;
    }
    let slug = slugify(name) || `equipe-${extId}`;
    let i = 2;
    while (this.slugs.has(slug)) slug = `${slugify(name)}-${i++}`;
    const row = {
      slug, name, short_name: name, abbreviation: extra.abbreviation ?? null, aliases: [name],
      logo_url: extra.logo ?? null, color: extra.color ? `#${extra.color.replace("#", "")}` : null,
      is_national: extra.national ?? false,
      ...(src === "oanor" ? { oanor_id: String(extId) } : { apisports_id: Number(extId) }),
    };
    const { data, error } = await this.db.from("teams").insert(row).select().single();
    if (error) throw error;
    this.add(data as Team);
    return data as Team;
  }
}

// ---------- Oanor ----------
async function oanor(path: string, key: string, budget: Budget) {
  budget.take();
  let res = await fetch(`${OANOR_BASE}${path}`, { headers: { "x-oanor-key": key } });
  // panne passagère chez Oanor (502/503/504) : un seul nouvel essai après 3 s
  if (res.status >= 500) {
    await new Promise((r) => setTimeout(r, 3000));
    budget.take();
    res = await fetch(`${OANOR_BASE}${path}`, { headers: { "x-oanor-key": key } });
  }
  if (!res.ok) throw new Error(`Oanor ${path} → HTTP ${res.status}`);
  const body = await res.json();
  if (body.success === false) throw new Error(`Oanor ${path} → ${body.message ?? "erreur"}`);
  return body.data;
}

function oanorStatus(m: { status?: string; completed?: boolean }) {
  const s = (m.status ?? "").toLowerCase();
  if (m.completed || /final|full time|ft\b|ended/.test(s)) return "finished";
  if (/half/.test(s)) return "halftime";
  if (/postpon/.test(s)) return "postponed";
  if (/cancel|abandon/.test(s)) return "cancelled";
  if (/progress|live|1st|2nd|first|second|extra/.test(s)) return "live";
  return "scheduled";
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

async function oanorTeams(db: SupabaseClient, key: string, budget: Budget, comps: Competition[], idx: TeamIndex) {
  for (const c of comps) {
    const data = await oanor(`/teams?league=${c.oanor_id}`, key, budget);
    const links = [];
    for (const t of data.teams ?? []) {
      const team = await idx.resolve("oanor", t.id, t.name, { logo: t.logo, color: t.color, abbreviation: t.abbreviation, national: c.kind === "international" });
      links.push({ team_id: team.id, competition_id: c.id, season: c.current_season });
    }
    if (links.length) await db.from("team_competitions").upsert(links, { onConflict: "team_id,competition_id,season", ignoreDuplicates: true });
  }
}

async function oanorMatches(db: SupabaseClient, key: string, budget: Budget, c: Competition, idx: TeamIndex, from: Date, to: Date) {
  const data = await oanor(`/matches?league=${c.oanor_id}&dates=${ymd(from)}-${ymd(to)}`, key, budget);
  const rows = [];
  for (const m of data.matches ?? []) {
    if (!m.home?.id || !m.away?.id) continue;
    const home = await idx.resolve("oanor", m.home.id, m.home.team, { logo: m.home.logo, abbreviation: m.home.abbreviation, national: c.kind === "international" });
    const away = await idx.resolve("oanor", m.away.id, m.away.team, { logo: m.away.logo, abbreviation: m.away.abbreviation, national: c.kind === "international" });
    const status = oanorStatus(m);
    const hs = m.home.score != null && m.home.score !== "" ? Number(m.home.score) : null;
    const as = m.away.score != null && m.away.score !== "" ? Number(m.away.score) : null;
    rows.push({
      competition_id: c.id, season: c.current_season, kickoff_at: m.date,
      home_team_id: home.id, away_team_id: away.id,
      home_score: status === "scheduled" ? null : hs, away_score: status === "scheduled" ? null : as,
      status, clock: status === "live" ? m.clock ?? null : null, venue: m.venue ?? null,
      source: "oanor", external_id: String(m.id),
    });
  }
  if (rows.length) {
    const { error } = await db.from("matches").upsert(rows, { onConflict: "source,external_id" });
    if (error) throw error;
  }
  return rows;
}

async function oanorStandings(db: SupabaseClient, key: string, budget: Budget, c: Competition, idx: TeamIndex) {
  const data = await oanor(`/standings?league=${c.oanor_id}`, key, budget);
  const table = data.table ?? [];
  if (!table.length) return 0;
  const rows = [];
  for (const r of table) {
    const team = await idx.resolve("oanor", r.id, r.team, { logo: r.logo, national: c.kind === "international" });
    rows.push({
      competition_id: c.id, season: c.current_season, team_id: team.id, rank: r.rank,
      played: r.played ?? 0, won: r.wins ?? 0, drawn: r.draws ?? 0, lost: r.losses ?? 0,
      points_for: r.points_for ?? 0, points_against: r.points_against ?? 0,
      tries_for: r.tries_for ?? null, tries_against: r.tries_against ?? null,
      bonus: r.bonus_points ?? 0, points: r.league_points ?? 0, updated_at: new Date().toISOString(),
    });
  }
  await db.from("standings").delete().eq("competition_id", c.id).eq("season", c.current_season);
  const { error } = await db.from("standings").insert(rows);
  if (error) throw error;
  return rows.length;
}

// ---------- API-Sports ----------
async function apisports(path: string, key: string, budget: Budget) {
  budget.take();
  const res = await fetch(`${APISPORTS_BASE}${path}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`API-Sports ${path} → HTTP ${res.status}`);
  const body = await res.json();
  const errs = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  if (errs && errs.length) throw new Error(`API-Sports ${path} → ${errs.join(" / ")}`);
  return body.response;
}

function apiStatus(short: string) {
  if (["FT", "AET", "PEN", "AW"].includes(short)) return "finished";
  if (short === "HT" || short === "BT") return "halftime";
  if (["1H", "2H", "ET", "PT"].includes(short)) return "live";
  if (short === "POST" || short === "INTR") return "postponed";
  if (short === "CANC" || short === "ABD") return "cancelled";
  return "scheduled";
}

// API-Sports utilise l'année de début (2023 = saison 2023-2024 en Europe)
function seasonLabel(c: Competition, year: number) {
  return c.current_season.includes("-") ? `${year}-${year + 1}` : String(year);
}

async function apisportsImport(db: SupabaseClient, key: string, budget: Budget, c: Competition, year: number, idx: TeamIndex) {
  let leagueId = c.apisports_id;
  if (!leagueId) {
    const leagues = await apisports(`/leagues?search=${encodeURIComponent(c.apisports_name ?? c.name)}`, key, budget);
    const wanted = norm(c.apisports_name ?? c.name);
    const hit = (leagues ?? []).find((l: { name: string }) => norm(l.name) === wanted) ?? leagues?.[0];
    if (!hit) throw new Error(`Compétition introuvable chez API-Sports : ${c.name}`);
    leagueId = hit.id;
    await db.from("competitions").update({ apisports_id: leagueId }).eq("id", c.id);
  }
  const season = seasonLabel(c, year);
  const games = await apisports(`/games?league=${leagueId}&season=${year}`, key, budget);
  const rows = [];
  const links = new Map<string, { team_id: string; competition_id: string; season: string }>();
  for (const g of games ?? []) {
    const home = await idx.resolve("apisports", g.teams.home.id, g.teams.home.name, { logo: g.teams.home.logo, national: c.kind === "international" });
    const away = await idx.resolve("apisports", g.teams.away.id, g.teams.away.name, { logo: g.teams.away.logo, national: c.kind === "international" });
    links.set(home.id, { team_id: home.id, competition_id: c.id, season });
    links.set(away.id, { team_id: away.id, competition_id: c.id, season });
    const status = apiStatus(g.status?.short ?? "NS");
    rows.push({
      competition_id: c.id, season, round: g.week ? String(g.week) : null, kickoff_at: g.date,
      home_team_id: home.id, away_team_id: away.id,
      home_score: g.scores?.home ?? null, away_score: g.scores?.away ?? null,
      status, source: "apisports", external_id: String(g.id),
    });
  }
  if (links.size) await db.from("team_competitions").upsert([...links.values()], { onConflict: "team_id,competition_id,season", ignoreDuplicates: true });
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("matches").upsert(rows.slice(i, i + 200), { onConflict: "source,external_id" });
    if (error) throw error;
  }
  return { season, games: rows.length };
}

// ---------- handler ----------
Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const secret = req.headers.get("x-sync-secret") ?? "";
  const { data: ok } = await db.rpc("check_sync_secret", { s: secret });
  if (!ok) return json({ error: "unauthorized" }, 401);

  const { job = "daily", params = {} } = await req.json().catch(() => ({}));

  const { data: comps } = await db.from("competitions").select("*");
  const { data: teams } = await db.from("teams").select("id,slug,name,short_name,abbreviation,aliases,city,oanor_id,apisports_id,logo_url");
  const idx = new TeamIndex(db, (teams ?? []) as Team[]);
  const allComps = (comps ?? []) as Competition[];

  // ---- API-Sports (import ponctuel, lancé depuis l'admin) ----
  if (job === "apisports") {
    const key = Deno.env.get("APISPORTS_KEY");
    if (!key) return json({ error: "Clé APISPORTS_KEY manquante" }, 400);
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { data: used } = await db.from("sync_runs").select("calls").eq("provider", "apisports").gte("created_at", since.toISOString());
    const budget = new Budget(APISPORTS_DAILY_CAP - (used ?? []).reduce((a, r) => a + r.calls, 0));
    const comp = allComps.find((c) => c.slug === params.competition);
    let result: unknown = null; let okRun = true; let message = "";
    try {
      if (!comp) throw new Error("Compétition inconnue");
      result = await apisportsImport(db, key, budget, comp, Number(params.year), idx);
      message = JSON.stringify(result);
    } catch (e) { okRun = false; message = (e as Error).message; }
    await db.from("sync_runs").insert({ provider: "apisports", job: `import ${params.competition} ${params.year}`, calls: budget.used, ok: okRun, message });
    return json({ ok: okRun, message, result }, okRun ? 200 : 500);
  }

  // ---- Oanor (daily / live / teams) ----
  const key = Deno.env.get("OANOR_KEY");
  if (!key) {
    await db.from("sync_runs").insert({ provider: "oanor", job, calls: 0, ok: false, message: "Clé OANOR_KEY manquante" });
    return json({ error: "Clé OANOR_KEY manquante" }, 400);
  }
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { data: used } = await db.from("sync_runs").select("calls").eq("provider", "oanor").gte("created_at", monthStart.toISOString());
  const budget = new Budget(OANOR_MONTHLY_CAP - (used ?? []).reduce((a, r) => a + r.calls, 0));
  const oanorComps = allComps.filter((c) => c.oanor_id);
  const log: string[] = [];
  let okRun = true;

  // une compétition en panne ne bloque pas les autres
  const each = async (c: Competition, fn: () => Promise<string>) => {
    try {
      log.push(`${c.slug}: ${await fn()}`);
    } catch (e) {
      okRun = false;
      log.push(`${c.slug}: ERREUR ${(e as Error).message}`);
      if ((e as Error).message === "quota atteint") throw e;
    }
  };

  try {
    const { count: knownTeams } = await db.from("teams").select("id", { count: "exact", head: true }).not("oanor_id", "is", null);
    if (job === "teams" || !knownTeams) {
      for (const c of oanorComps) await each(c, async () => { await oanorTeams(db, key, budget, [c], idx); return "équipes"; });
    }
    if (job === "daily" || job === "teams") {
      const from = new Date(Date.now() - 4 * 86400e3);
      const to = new Date(Date.now() + 14 * 86400e3);
      for (const c of oanorComps) {
        await each(c, async () => {
          const rows = await oanorMatches(db, key, budget, c, idx, from, to);
          let st = 0;
          if (c.standings_mode === "api") st = await oanorStandings(db, key, budget, c, idx);
          return `${rows.length} matchs, ${st} au classement`;
        });
      }
    }
    if (job === "live") {
      const { data: window } = await db.from("matches")
        .select("competition_id, status")
        .eq("source", "oanor")
        .gte("kickoff_at", new Date(Date.now() - 165 * 60e3).toISOString())
        .lte("kickoff_at", new Date(Date.now() + 10 * 60e3).toISOString());
      const compIds = [...new Set((window ?? []).filter((m) => !["finished", "postponed", "cancelled"].includes(m.status)).map((m) => m.competition_id))];
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400e3);
      for (const id of compIds) {
        const c = oanorComps.find((x) => x.id === id);
        if (!c) continue;
        await each(c, async () => {
          const rows = await oanorMatches(db, key, budget, c, idx, yesterday, today);
          const justFinished = rows.some((r) => r.status === "finished") && (window ?? []).some((m) => m.competition_id === id && m.status !== "finished");
          if (justFinished && c.standings_mode === "api") await oanorStandings(db, key, budget, c, idx);
          return `direct ${rows.length}`;
        });
      }
    }
  } catch (e) {
    okRun = false;
    log.push(`ERREUR ${(e as Error).message}`);
  }

  if (budget.used > 0 || !okRun) {
    await db.from("sync_runs").insert({ provider: "oanor", job, calls: budget.used, ok: okRun, message: log.join(" | ") });
  }
  return json({ ok: okRun, calls: budget.used, remaining: budget.remaining, log }, okRun ? 200 : 500);
});
