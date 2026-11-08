import type { SupabaseClient } from "@supabase/supabase-js";
import { ecrireFil, type EvtPropose } from "@/lib/fil";

/**
 * Feuilles de match publiques d'ESPN : compositions (numéros, titulaires, remplaçants),
 * marqueurs, buteurs, cartons et remplacements minute par minute.
 * On en tire, pour chaque joueur, minutes jouées, titularisation et points, sans rien saisir.
 */
const BASE = "https://site.api.espn.com/apis/site/v2/sports/rugby";
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => norm(s).replace(/ /g, "-");
const MOTS_VIDES = new Set(["stade", "rugby", "club", "rc", "us", "usa", "asm", "union", "section", "olympique", "racing", "fc", "ca", "cs", "su", "sa", "as", "lou", "paris", "the", "de", "du", "la", "le", "et", "and"]);

type EquipeEspn = { id: string; displayName: string; shortDisplayName?: string; abbreviation?: string; name?: string; location?: string };
type EvtEspn = {
  id: string; date: string; status?: { type?: { name?: string; completed?: boolean } };
  competitions: { competitors: { homeAway: "home" | "away"; score?: string; team: EquipeEspn }[] }[];
};
type Athlete = { id: string; fullName?: string; displayName?: string; firstName?: string; lastName?: string };
type Detail = { type?: { id?: string; text?: string }; clock?: { value?: number; displayValue?: string }; team?: { id?: string }; participants?: { athlete?: Athlete }[] };
type Roster = { homeAway: "home" | "away"; team: EquipeEspn; roster?: { jersey?: string; starter?: boolean; athlete: Athlete; position?: { abbreviation?: string } }[] };

async function espn<T>(chemin: string): Promise<T> {
  const r = await fetch(`${BASE}${chemin}`, { cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { "user-agent": "AmbianceRugby/1.0" } });
  if (!r.ok) throw new Error(`ESPN : HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

const jour = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const cacheTableaux = new Map<string, Promise<EvtEspn[]>>();
function tableau(ligue: string, d: string) {
  const k = `${ligue}:${d}`;
  if (!cacheTableaux.has(k)) cacheTableaux.set(k, espn<{ events?: EvtEspn[] }>(`/${ligue}/scoreboard?dates=${d}`).then((x) => x.events ?? []).catch(() => []));
  return cacheTableaux.get(k)!;
}

type EquipeLocale = { id: string; name: string; short_name: string | null; abbreviation: string | null; aliases: string[] | null; espn_id: string | null };
/** Ressemblance entre une équipe du site et une équipe ESPN : 2 = même id ESPN, 1 = un mot du nom en commun. */
function ressemblance(t: EquipeLocale, e: EquipeEspn) {
  if (t.espn_id) return t.espn_id === e.id ? 2 : -5;
  const mots = (s: string | null | undefined) => norm(s).split(" ").filter((w) => w.length >= 3 && !MOTS_VIDES.has(w));
  const a = new Set([t.name, t.short_name, ...(t.aliases ?? [])].flatMap(mots));
  const b = [e.displayName, e.shortDisplayName, e.name, e.location].flatMap(mots);
  if (b.some((w) => a.has(w))) return 1;
  const na = norm(t.name), nb = norm(e.displayName);
  return na && nb && (na.includes(nb) || nb.includes(na)) ? 1 : 0;
}

export type MatchLocal = {
  id: string; competition_id?: string; kickoff_at: string; home_score: number | null; away_score: number | null; home_team_id: string; away_team_id: string; espn_event_id?: string | null;
  home: EquipeLocale; away: EquipeLocale; competition: { espn_league: string | null };
};

/** Retrouve le match ESPN correspondant (même jour, même horaire à 3 h près, équipes qui se ressemblent). */
export async function trouverMatchEspn(m: MatchLocal): Promise<{ eventId: string; inverse: boolean; homeEspn: string; awayEspn: string } | null> {
  const ligue = m.competition.espn_league;
  if (!ligue) return null;
  const k = new Date(m.kickoff_at);
  const jours = [0, -1, 1].map((d) => jour(new Date(k.getTime() + d * 86400e3)));
  let meilleur: { eventId: string; inverse: boolean; homeEspn: string; awayEspn: string; score: number } | null = null;
  for (const d of jours) {
    for (const ev of await tableau(ligue, d)) {
      if (m.espn_event_id && ev.id !== m.espn_event_id) continue;
      const c = ev.competitions?.[0];
      const h = c?.competitors.find((x) => x.homeAway === "home")?.team;
      const a = c?.competitors.find((x) => x.homeAway === "away")?.team;
      if (!h || !a) continue;
      if (ev.status?.type?.completed === false && !m.espn_event_id) continue;
      const ecart = Math.abs(new Date(ev.date).getTime() - k.getTime()) / 3600e3;
      if (ecart > 3 && !m.espn_event_id) continue;
      const droit = ressemblance(m.home, h) + ressemblance(m.away, a);
      const inverse = ressemblance(m.home, a) + ressemblance(m.away, h);
      const score = Math.max(droit, inverse) - ecart / 10;
      if (Math.max(droit, inverse) >= 1 && (!meilleur || score > meilleur.score)) {
        meilleur = { eventId: ev.id, inverse: inverse > droit, homeEspn: inverse > droit ? a.id : h.id, awayEspn: inverse > droit ? h.id : a.id, score };
      }
    }
    if (meilleur) break;
  }
  return meilleur;
}

type Ligne = { player_id: string; team_id: string; numero: number | null; starter: boolean; minutes: number; tries: number; conversions: number; penalty_goals: number; drop_goals: number; yellow: number; red: number };
export type ResultatEspn = { ok: true; joueurs: number; crees: number; fil: number; dom: number; ext: number; conforme: boolean } | { ok: false; raison: string };

const minuteDe = (d: Detail) => {
  const t = d.clock?.displayValue ? parseInt(d.clock.displayValue, 10) : NaN;
  if (Number.isFinite(t)) return t;
  return d.clock?.value != null ? Math.round(d.clock.value / 60) : null;
};
const genre = (d: Detail): string | null => {
  const t = norm(d.type?.text);
  if (t === "try") return "try";
  if (t === "penalty try") return "penalty_try";
  if (t === "conversion") return "conversion";
  if (t === "penalty goal" || t === "penalty") return "penalty";
  if (t.includes("drop")) return "drop";
  if (t === "yellow card") return "yellow";
  if (t === "red card") return "red";
  if (t === "player substituted") return "out";
  if (t === "substitute on") return "in";
  return null;
};

/**
 * Lit la feuille de match ESPN et l'enregistre : stats par joueur (upsert) et fil du match.
 * Les joueurs absents de la base sont créés dans leur club ; l'identifiant ESPN est mémorisé pour la suite.
 */
export async function importerFeuilleEspn(db: SupabaseClient, m: MatchLocal, opts: { remplacer?: boolean } = {}): Promise<ResultatEspn> {
  const cible = await trouverMatchEspn(m);
  if (!cible) return { ok: false, raison: m.competition.espn_league ? "match introuvable sur ESPN" : "compétition non couverte par ESPN" };

  const s = await espn<{ rosters?: Roster[]; header?: { competitions?: { details?: Detail[]; status?: { type?: { completed?: boolean } } }[] } }>(`/${m.competition.espn_league}/summary?event=${cible.eventId}`);
  const rosters = s.rosters ?? [];
  const details = s.header?.competitions?.[0]?.details ?? [];
  if (!rosters.some((r) => r.roster?.length)) return { ok: false, raison: "feuille de match pas encore publiée sur ESPN" };

  // mémorise les équipes ESPN pour les prochaines fois
  if (!m.home.espn_id) await db.from("teams").update({ espn_id: cible.homeEspn }).eq("id", m.home_team_id).is("espn_id", null);
  if (!m.away.espn_id) await db.from("teams").update({ espn_id: cible.awayEspn }).eq("id", m.away_team_id).is("espn_id", null);
  await db.from("matches").update({ espn_event_id: cible.eventId }).eq("id", m.id);
  const equipeDe = (espnTeamId: string | undefined) => (espnTeamId === cible.homeEspn ? m.home_team_id : espnTeamId === cible.awayEspn ? m.away_team_id : null);

  // joueurs du site : par identifiant ESPN, puis par nom (dans le club d'abord)
  const athletes = rosters.flatMap((r) => (r.roster ?? []).map((p) => ({ ...p, team_id: equipeDe(r.team.id) }))).filter((p) => p.team_id && p.athlete?.id);
  const ids = athletes.map((p) => p.athlete.id);
  const { data: parId } = await db.from("players").select("id, espn_id").in("espn_id", ids);
  const { data: duClub } = await db.from("players").select("id, first_name, last_name, name_key, team_id, espn_id").in("team_id", [m.home_team_id, m.away_team_id]);
  const cles = athletes.map((p) => norm(p.athlete.fullName ?? p.athlete.displayName));
  const { data: parCle } = await db.from("players").select("id, name_key, espn_id").in("name_key", cles.filter(Boolean));
  const joueurDe = new Map<string, string>();
  let crees = 0;
  for (const p of athletes) {
    const nom = p.athlete.fullName ?? p.athlete.displayName ?? "";
    const cle = norm(nom);
    let id = parId?.find((x) => x.espn_id === p.athlete.id)?.id;
    const club = (duClub ?? []).filter((x) => x.team_id === p.team_id && !x.espn_id);
    if (!id) id = club.find((x) => x.name_key === cle || norm(`${x.first_name} ${x.last_name}`) === cle)?.id;
    if (!id) {
      // même nom de famille et même initiale, sans ambiguïté
      const mots = cle.split(" ");
      const memes = club.filter((x) => {
        const nf = norm(x.last_name);
        return nf && cle.endsWith(` ${nf}`) && norm(x.first_name).slice(0, 1) === mots[0]?.slice(0, 1);
      });
      if (memes.length === 1) id = memes[0].id;
    }
    if (!id) id = parCle?.find((x) => x.name_key === cle && !x.espn_id)?.id;
    if (!id) {
      const morceaux = nom.trim().split(/\s+/);
      const prenom = p.athlete.firstName ?? morceaux[0] ?? "";
      const famille = p.athlete.lastName ?? morceaux.slice(1).join(" ") ?? nom;
      for (let n = 1; n < 6 && !id; n++) {
        const slug = slugify(nom) + (n > 1 ? `-${n}` : "");
        const { data, error } = await db.from("players").insert({
          slug, first_name: prenom, last_name: famille || prenom, team_id: p.team_id, name_key: cle || null, source: "espn", in_squad: true, espn_id: p.athlete.id,
        }).select("id").single();
        if (data) { id = data.id; crees++; }
        else if (error?.code !== "23505") break;
        else if (error.message.includes("name_key")) break;
      }
    }
    if (!id) continue;
    joueurDe.set(p.athlete.id, id);
    await db.from("players").update({ espn_id: p.athlete.id }).eq("id", id).is("espn_id", null);
  }

  // minutes : titulaires (n° 1 à 15) de 0 à la sortie, remplaçants de l'entrée à la fin
  const fin = Math.max(80, ...details.map((d) => minuteDe(d) ?? 0));
  const terrain = new Map<string, number | null>(); // joueur -> minute d'entrée, null = hors du terrain
  const minutes = new Map<string, number>();
  const lignes = new Map<string, Ligne>();
  for (const p of athletes) {
    const pid = joueurDe.get(p.athlete.id);
    if (!pid) continue;
    const numero = p.jersey ? parseInt(p.jersey, 10) : NaN;
    const titulaire = p.starter || (Number.isFinite(numero) && numero <= 15);
    lignes.set(pid, { player_id: pid, team_id: p.team_id!, numero: Number.isFinite(numero) ? numero : null, starter: titulaire, minutes: 0, tries: 0, conversions: 0, penalty_goals: 0, drop_goals: 0, yellow: 0, red: 0 });
    terrain.set(pid, titulaire ? 0 : null);
  }
  const sortir = (pid: string, min: number) => { const e = terrain.get(pid); if (e != null) { minutes.set(pid, (minutes.get(pid) ?? 0) + Math.max(0, min - e)); terrain.set(pid, null); } };
  const fil: EvtPropose[] = [];
  const tries = [...details].sort((a, b) => (a.clock?.value ?? 0) - (b.clock?.value ?? 0));
  for (let i = 0; i < tries.length; i++) {
    const d = tries[i];
    const g = genre(d);
    if (!g) continue;
    const min = minuteDe(d) ?? 0;
    const pid = d.participants?.[0]?.athlete?.id ? joueurDe.get(d.participants[0].athlete.id) : undefined;
    const team = equipeDe(d.team?.id);
    const cote: "home" | "away" = team === m.away_team_id ? "away" : "home";
    const l = pid ? lignes.get(pid) : undefined;
    const nom = d.participants?.[0]?.athlete?.displayName ?? "";
    if (g === "out") { if (pid) sortir(pid, min); continue; }
    if (g === "in") {
      if (pid && terrain.get(pid) == null) terrain.set(pid, min);
      // le joueur remplacé est le « player substituted » de la même minute et de la même équipe
      const sortant = tries.slice(Math.max(0, i - 3), i + 4).find((x) => genre(x) === "out" && x.team?.id === d.team?.id && minuteDe(x) === min);
      const nomSortant = sortant?.participants?.[0]?.athlete?.displayName;
      fil.push({ minute: min, cote, player_id: pid ?? null, nom: nomSortant ? `${pid ? "" : `${nom} `}remplace ${nomSortant}`.trim() : nom, type: "sub" });
      continue;
    }
    if (l) {
      if (g === "try") l.tries++;
      if (g === "conversion") l.conversions++;
      if (g === "penalty") l.penalty_goals++;
      if (g === "drop") l.drop_goals++;
      if (g === "yellow") l.yellow++;
      if (g === "red") { l.red++; sortir(pid!, min); }
    }
    fil.push({ minute: min, cote, player_id: pid ?? null, nom, type: g });
  }
  for (const pid of terrain.keys()) sortir(pid, fin);
  for (const [pid, n] of minutes) { const l = lignes.get(pid); if (l) l.minutes = Math.min(100, n); }

  // seuls les joueurs entrés en jeu ont une ligne de stats
  const rows = [...lignes.values()].filter((l) => l.starter || l.minutes > 0 || l.tries + l.conversions + l.penalty_goals + l.drop_goals + l.yellow + l.red > 0)
    .map((l) => ({ ...l, match_id: m.id, source: "espn" }));
  if (!rows.length) return { ok: false, raison: "composition vide sur ESPN" };

  const { count: autres } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).neq("source", "espn");
  const { count: manuels } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).is("source", null);
  if ((autres || manuels) && !opts.remplacer) return { ok: false, raison: "déjà saisi à la main" };
  // les lignes d'un import ESPN précédent qui ne sont plus valables (joueur mal reconnu) disparaissent
  await db.from("player_match_stats").delete().eq("match_id", m.id).eq("source", "espn").not("player_id", "in", `(${rows.map((r) => r.player_id).join(",")})`);
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from("player_match_stats").upsert(rows.slice(i, i + 100), { onConflict: "match_id,player_id" });
    if (error) throw new Error(error.message);
  }
  const nFil = await ecrireFil(db, m, fil, "espn");
  // nombre d'essais (essais de pénalité compris) : sert au bonus offensif du classement
  const essais = (cote: "home" | "away") => fil.filter((e) => (e.type === "try" || e.type === "penalty_try") && e.cote === cote).length;
  await db.from("matches").update({ home_tries: essais("home"), away_tries: essais("away") }).eq("id", m.id);
  if (m.competition_id) await db.rpc("appliquer_bonus_offensif", { p_comp: m.competition_id });

  const pts = (l: Ligne) => 5 * l.tries + 2 * l.conversions + 3 * (l.penalty_goals + l.drop_goals);
  const essaisPen = (cote: "home" | "away") => fil.filter((e) => e.type === "penalty_try" && e.cote === cote).length * 7;
  const dom = rows.filter((r) => r.team_id === m.home_team_id).reduce((s, l) => s + pts(l), 0) + essaisPen("home");
  const ext = rows.filter((r) => r.team_id === m.away_team_id).reduce((s, l) => s + pts(l), 0) + essaisPen("away");
  const conforme = m.home_score === dom && m.away_score === ext;
  return { ok: true, joueurs: rows.length, crees, fil: nFil, dom, ext, conforme };
}

/** Sélection Supabase d'un match prêt pour importerFeuilleEspn. */
export const SELECT_MATCH_ESPN = "id, competition_id, kickoff_at, home_score, away_score, home_team_id, away_team_id, espn_event_id, status, home:teams!matches_home_team_id_fkey(id,name,short_name,abbreviation,aliases,espn_id), away:teams!matches_away_team_id_fkey(id,name,short_name,abbreviation,aliases,espn_id), competition:competitions(name, espn_league)";
