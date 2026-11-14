import type { SupabaseClient } from "@supabase/supabase-js";
import { ecrireFil, type EvtPropose } from "@/lib/fil";

/**
 * Feuilles de match de World Rugby (API publique du match centre, données Opta) : compositions, minutes,
 * points, cartons, remplacements, homme du match, et toutes les stats détaillées de chaque joueur
 * (plaquages, courses, mètres, franchissements, défenseurs battus, passes, jeu au pied, touches…).
 * Source principale pour tout ce qui n'est pas Top 14 / Pro D2 (feuilles LNR) ; ESPN ne sert plus qu'en secours.
 */
const API = "https://api.wr-rims-prod.pulselive.com/rugby/v3";
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => norm(s).replace(/ /g, "-");
const MOTS_VIDES = new Set(["stade", "rugby", "club", "rc", "us", "usa", "asm", "union", "section", "olympique", "racing", "fc", "ca", "cs", "su", "sa", "as", "lou", "paris", "the", "de", "du", "la", "le", "et", "and", "u20", "men", "women"]);

// noms français des sélections → noms anglais de World Rugby
const EN: Record<string, string> = {
  "afrique du sud": "south africa", "nouvelle zelande": "new zealand", "angleterre": "england", "ecosse": "scotland", "irlande": "ireland",
  "pays de galles": "wales", "galles": "wales", "italie": "italy", "argentine": "argentina", "australie": "australia", "japon": "japan", "fidji": "fiji",
  "georgie": "georgia", "roumanie": "romania", "espagne": "spain", "chili": "chile", "etats unis": "usa", "namibie": "namibia",
  "allemagne": "germany", "belgique": "belgium", "pays bas": "netherlands", "russie": "russia", "bresil": "brazil", "hong kong": "hong kong china",
  "coree du sud": "korea", "tonga": "tonga", "samoa": "samoa", "canada": "canada", "portugal": "portugal", "uruguay": "uruguay", "zimbabwe": "zimbabwe",
};

type Nom = { display?: string; first?: { known?: string; official?: string }; last?: { known?: string; official?: string } };
type JoueurWr = { id: string; altId?: string; name?: Nom; isPlayerOfTheMatch?: boolean; role?: string };
type EquipeWr = { id: string; name: string; abbreviation?: string | null };
type MatchInfo = { matchId: string; teams: EquipeWr[]; scores?: number[]; status?: string; clock?: { secs?: number; label?: string } | null; time?: { millis?: number } };
type Stats = { match: MatchInfo; teamStats: { playerStats: { player: JoueurWr; number: string | null; position?: string | null; stats: Record<string, number> }[] }[] };
type Officiel = { official?: { name?: Nom; country?: string | null }; position?: string | null };
type Resume = { teams?: { teamList?: { list?: { player: JoueurWr; number: string | number | null; position?: string | null }[] } }[]; motm?: { motm?: JoueurWr | null } | null; officials?: Officiel[]; match?: { venue?: { name?: string; city?: string } | null } };

/** Arbitre principal et stade d'après le résumé World Rugby. */
function officiels(r: Resume | null) {
  const arb = (r?.officials ?? []).find((o) => norm(o.position) === "referee");
  const nom = arb?.official?.name ? `${prenomDe(arb.official.name)} ${nomDe(arb.official.name)}`.trim() : null;
  const v = r?.match?.venue;
  return { arbitre: nom || null, arbitre_pays: arb?.official?.country ?? null, stade: v?.name ?? null, ville: v?.city ?? null };
}

/** Avant-match : arbitre, stade et ville chez World Rugby (désignations connues quelques jours avant). Enregistré dans la base. */
export async function completerAvantMatch(db: SupabaseClient, m: MatchWr & { venue?: string | null }): Promise<{ arbitre: string | null; arbitre_pays: string | null } | null> {
  const cible = await trouver(m);
  if (!cible) return null;
  const r = await lire<Resume>(`/match/${cible.id}/summary`);
  const o = officiels(r);
  await db.from("matches").update({
    wr_id: cible.id, officiels_at: new Date().toISOString(),
    ...(o.arbitre ? { arbitre: o.arbitre, arbitre_pays: o.arbitre_pays } : {}),
    ...(o.stade && !m.venue ? { venue: o.stade } : {}), ...(o.ville ? { stade_ville: o.ville } : {}),
  }).eq("id", m.id);
  return o.arbitre ? { arbitre: o.arbitre, arbitre_pays: o.arbitre_pays } : null;
}
export type JoueurAnnonceWr = { numero: number; wrId: string; prenom: string; nom: string };
/** Composition annoncée chez World Rugby (les 23, publiée 2 jours avant le match), dans l'ordre domicile / extérieur du site. */
export async function lireCompositionWr(m: MatchWr): Promise<{ dom: JoueurAnnonceWr[]; ext: JoueurAnnonceWr[] } | null> {
  const cible = await trouver(m);
  if (!cible) return null;
  const r = await lire<Resume>(`/match/${cible.id}/summary`);
  const listes = (r?.teams ?? []).slice(0, 2).map((t) => (t.teamList?.list ?? [])
    .filter((p) => p.player?.id && p.number != null && (!p.player.role || p.player.role === "Player"))
    .map((p) => ({ numero: Number(p.number), wrId: p.player.id, prenom: prenomDe(p.player.name), nom: nomDe(p.player.name) }))
    .filter((p) => p.numero >= 1 && p.numero <= 30));
  if (listes.length < 2 || listes.some((l) => l.filter((p) => p.numero <= 15).length < 15)) return null;
  return cible.inverse ? { dom: listes[1], ext: listes[0] } : { dom: listes[0], ext: listes[1] };
}

type Evt = { phase?: string; time?: { secs?: number }; type?: string; typeLabel?: string; group?: string; points?: number; playerId?: string | null; playerAltId?: string | null; teamIndex?: number };

type EquipeLocale = { id: string; name: string; short_name?: string | null; abbreviation?: string | null; aliases?: string[] | null; wr_id?: string | null; is_national?: boolean | null };
export type MatchWr = {
  id: string; kickoff_at: string; status?: string; competition_id?: string | null; home_team_id: string; away_team_id: string;
  home_score: number | null; away_score: number | null; wr_id?: string | null; home: EquipeLocale; away: EquipeLocale;
};
export const SELECT_MATCH_WR = "id, kickoff_at, status, competition_id, home_team_id, away_team_id, home_score, away_score, wr_id, home:teams!matches_home_team_id_fkey(id,name,short_name,abbreviation,aliases,wr_id,is_national), away:teams!matches_away_team_id_fkey(id,name,short_name,abbreviation,aliases,wr_id,is_national)";

/** Dernière lecture ratée pour une raison réseau (limite de débit, serveur, délai) : à retenter bientôt, pas « pas de données ». */
let panneReseau = false;
async function lire<T>(chemin: string): Promise<T | null> {
  for (let essai = 0; essai < 3; essai++) {
    const r = await fetch(`${API}${chemin}`, { cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { "user-agent": "AmbianceRugby/1.0", accept: "application/json" } }).catch(() => null);
    if (r?.ok) { try { return (await r.json()) as T; } catch { /* réponse coupée : on retente */ } }
    else if (r && r.status === 404) return null;
    panneReseau = true;
    await new Promise((ok) => setTimeout(ok, 800 * (essai + 1)));
  }
  return null;
}

/** 2 = même identifiant World Rugby, 1 = noms qui se ressemblent, 0 = rien, -5 = identifiant différent. */
function ressemblance(t: EquipeLocale, e: EquipeWr) {
  if (t.wr_id) return t.wr_id === e.id ? 2 : -5;
  const noms = [t.name, t.short_name, ...(t.aliases ?? [])].map(norm).filter(Boolean);
  const anglais = noms.map((n) => EN[n] ?? n);
  const n = norm(e.name);
  if (anglais.includes(n) || noms.includes(n)) return 1.5;
  if (t.is_national) return 0; // une sélection doit avoir le même nom (pas « France U20 » pour « France »)
  const mots = (s: string) => s.split(" ").filter((w) => w.length >= 3 && !MOTS_VIDES.has(w));
  const a = new Set([...noms, ...anglais].flatMap(mots));
  if (mots(n).some((w) => a.has(w))) return 1;
  return noms.some((x) => x.includes(n) || n.includes(x)) ? 1 : 0;
}

const cacheJours = new Map<string, Promise<MatchInfo[]>>();
function matchsDuJour(d: string): Promise<MatchInfo[]> {
  if (!cacheJours.has(d)) {
    cacheJours.set(d, (async () => {
      const tous: MatchInfo[] = [];
      for (let page = 0; page < 5; page++) {
        // la fin doit être après le début (même jour = erreur 400) : on prend jusqu'au lendemain
        const fin = new Date(new Date(`${d}T00:00:00Z`).getTime() + 86400e3).toISOString().slice(0, 10);
        const r = await lire<{ content?: MatchInfo[]; pageInfo?: { numPages?: number } }>(`/match?startDate=${d}&endDate=${fin}&sort=asc&pageSize=100&page=${page}`);
        tous.push(...(r?.content ?? []));
        if (!r || (r.pageInfo?.numPages ?? 1) <= page + 1) break;
      }
      return tous;
    })());
  }
  return cacheJours.get(d)!;
}

/** Retrouve le match World Rugby : même jour (à un jour près, fuseaux), équipes reconnues. */
async function trouver(m: MatchWr): Promise<{ id: string; inverse: boolean } | null> {
  const k = new Date(m.kickoff_at).getTime();
  const jours = [0, -1, 1].map((x) => new Date(k + x * 86400e3).toISOString().slice(0, 10));
  let meilleur: { id: string; inverse: boolean; score: number } | null = null;
  for (const d of jours) {
    for (const x of await matchsDuJour(d)) {
      if (m.wr_id && x.matchId !== m.wr_id) continue;
      const [t0, t1] = x.teams ?? [];
      if (!t0 || !t1) continue;
      const droit = ressemblance(m.home, t0) + ressemblance(m.away, t1);
      const inverse = ressemblance(m.home, t1) + ressemblance(m.away, t0);
      const ecart = x.time?.millis ? Math.abs(x.time.millis - k) / 3600e3 : 0;
      if (ecart > 30) continue;
      const s = Math.max(droit, inverse) - ecart / 24;
      // les deux équipes reconnues, ou une seule mais avec le même score final
      const memeScore = !!x.scores && m.home_score != null && ((droit >= inverse && x.scores[0] === m.home_score && x.scores[1] === m.away_score) || (inverse > droit && x.scores[1] === m.home_score && x.scores[0] === m.away_score));
      const ok = Math.min(...(droit >= inverse ? [ressemblance(m.home, t0), ressemblance(m.away, t1)] : [ressemblance(m.home, t1), ressemblance(m.away, t0)])) >= 1 || (Math.max(droit, inverse) >= 1 && memeScore);
      if (ok && (!meilleur || s > meilleur.score)) meilleur = { id: x.matchId, inverse: inverse > droit, score: s };
    }
    if (meilleur) break;
  }
  if (meilleur) return { id: meilleur.id, inverse: meilleur.inverse };
  // noms trop différents (« Stade Toulousain » / « Toulouse ») : match terminé au même horaire avec exactement le même score
  if (m.home_score == null || m.away_score == null || m.home_score + m.away_score === 0) return null;
  const memes: { id: string; inverse: boolean }[] = [];
  for (const d of jours) {
    for (const x of await matchsDuJour(d)) {
      if (!x.scores || x.scores.length !== 2 || !x.time?.millis || Math.abs(x.time.millis - k) > 3 * 3600e3) continue;
      if ((x.status ?? "").toUpperCase() !== "C") continue;
      const [a, b] = x.scores.map(Number);
      if (a === b) continue; // match nul : impossible de savoir qui reçoit
      if (a === m.home_score && b === m.away_score) memes.push({ id: x.matchId, inverse: false });
      else if (a === m.away_score && b === m.home_score && a !== b) memes.push({ id: x.matchId, inverse: true });
    }
  }
  const uniques = [...new Map(memes.map((x) => [x.id, x])).values()];
  return uniques.length === 1 ? uniques[0] : null;
}

const POSTE: Record<string, string> = { PR: "pilier", LP: "pilier", TP: "pilier", HK: "talonneur", LK: "deuxieme-ligne", L: "deuxieme-ligne", FL: "troisieme-ligne", BR: "troisieme-ligne", N8: "troisieme-ligne", SH: "demi-de-melee", FH: "demi-d-ouverture", C: "centre", CE: "centre", W: "ailier", WI: "ailier", FB: "arriere" };
const POSTE_NUM: Record<number, string> = { 1: "pilier", 2: "talonneur", 3: "pilier", 4: "deuxieme-ligne", 5: "deuxieme-ligne", 6: "troisieme-ligne", 7: "troisieme-ligne", 8: "troisieme-ligne", 9: "demi-de-melee", 10: "demi-d-ouverture", 11: "ailier", 12: "centre", 13: "centre", 14: "ailier", 15: "arriere", 16: "talonneur", 17: "pilier", 18: "pilier", 19: "deuxieme-ligne", 20: "troisieme-ligne", 21: "demi-de-melee" };
const titre = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const prenomDe = (n?: Nom) => titre(n?.first?.known || n?.first?.official || (n?.display ?? "").split(" ")[0] || "");
const nomDe = (n?: Nom) => titre(n?.last?.known || n?.last?.official || (n?.display ?? "").split(" ").slice(1).join(" ") || "");

/** Genre d'un fait du fil World Rugby (null = pas un fait de feuille de match). */
function genre(e: Evt): string | null {
  const t = (e.type ?? "").toLowerCase(), l = norm(e.typeLabel), g = (e.group ?? "").toLowerCase();
  if (t === "sub on") return "in";
  if (t === "sub off") return "out";
  if (t === "yellow" || g === "yc") return "yellow";
  if (t === "red" || g === "rc") return "red";
  if (!e.points) return null;
  if (l.includes("penalty try") || t.startsWith("pt")) return "penalty_try";
  if (l.includes("try") || t === "t5") return "try";
  if (l.includes("conversion") || t === "c2") return "conversion";
  if (l.includes("drop")) return "drop";
  if (l.includes("penalty") || t === "p3") return "penalty";
  return null;
}
const minuteDe = (e: Evt) => {
  const s = e.time?.secs ?? 0;
  const ph = (e.phase ?? "").toUpperCase();
  // en deuxième période, le chrono repart parfois de zéro
  return Math.min(130, Math.floor(s / 60) + (ph === "L2" && s < 2400 ? 40 : 0));
};

/** Colonnes de stats remplies depuis les clés Opta de World Rugby. */
function detail(x: Record<string, number>) {
  const n = (...k: string[]) => Math.round(k.reduce((t, c) => t + (Number(x[c]) || 0), 0));
  return {
    tackles: n("Tackles"), missed_tackles: n("MissedTackles"), carries: n("Carries"), metres: n("Metres"), line_breaks: n("CleanBreaks"),
    offloads: n("Offload"), turnovers_won: n("TurnoverWon"), penalties_conceded: n("PenDefs", "PenOffs"),
    defenders_beaten: n("DefendersBeaten"), try_assists: n("TryAssist"), passes: n("Passes"), kicks: n("KicksFromHand"), kick_metres: n("KickFromHandMetres"),
    dominant_tackles: n("DominantTackles"), lineouts_won: n("LineoutsWon"), lineouts_stolen: n("LineoutWonSteal"), rucks_won: n("RucksWon"),
    handling_errors: n("HandlingError"), turnovers_conceded: n("TurnoversConceded"),
  };
}

export type ResultatWr = { ok: true; joueurs: number; crees: number; fil: number; dom: number; ext: number; conforme: boolean; detail: boolean; live: boolean } | { ok: false; raison: string };

/**
 * Lit la feuille World Rugby d'un match et l'enregistre : une ligne par joueur entré en jeu (stats complètes),
 * fil du match, homme du match officiel ; en direct, score et chrono. Remplace une feuille ESPN précédente.
 */
export async function importerFeuilleWr(db: SupabaseClient, m: MatchWr, opts: { remplacer?: boolean; completer?: boolean } = {}): Promise<ResultatWr> {
  panneReseau = false;
  const cible = await trouver(m);
  if (!cible) return { ok: false, raison: panneReseau ? "erreur réseau World Rugby" : "match introuvable chez World Rugby" };
  const [s, resume, fil] = await Promise.all([
    lire<Stats>(`/match/${cible.id}/stats`),
    lire<Resume>(`/match/${cible.id}/summary`),
    lire<{ timeline?: Evt[] }>(`/match/${cible.id}/timeline`),
  ]);
  if (!s) return { ok: false, raison: panneReseau ? "erreur réseau World Rugby" : "feuille pas encore publiée chez World Rugby" };
  if (!s.teamStats?.length) return { ok: false, raison: "feuille pas encore publiée chez World Rugby" };
  const statut = (s.match.status ?? "").toUpperCase();
  const live = statut.startsWith("L");
  const fini = statut === "C";
  if (!live && !fini) return { ok: false, raison: "match pas encore joué chez World Rugby" };

  const equipes = cible.inverse ? [m.away_team_id, m.home_team_id] : [m.home_team_id, m.away_team_id];
  // mémorise les identifiants World Rugby pour les fois suivantes
  const o = officiels(resume);
  await db.from("matches").update({ wr_id: cible.id, ...(o.arbitre ? { arbitre: o.arbitre, arbitre_pays: o.arbitre_pays } : {}), ...(o.ville ? { stade_ville: o.ville } : {}) }).eq("id", m.id);
  const [w0, w1] = s.match.teams ?? [];
  if (w0 && w1) {
    const [tA, tB] = cible.inverse ? [m.away, m.home] : [m.home, m.away];
    if (!tA.wr_id && !tA.is_national) await db.from("teams").update({ wr_id: w0.id }).eq("id", tA.id).is("wr_id", null);
    if (!tB.wr_id && !tB.is_national) await db.from("teams").update({ wr_id: w1.id }).eq("id", tB.id).is("wr_id", null);
    if (tA.is_national && !tA.wr_id && norm(w0.name) && ressemblance(tA, w0) >= 1.5) await db.from("teams").update({ wr_id: w0.id }).eq("id", tA.id).is("wr_id", null);
    if (tB.is_national && !tB.wr_id && norm(w1.name) && ressemblance(tB, w1) >= 1.5) await db.from("teams").update({ wr_id: w1.id }).eq("id", tB.id).is("wr_id", null);
  }

  // les joueurs de la feuille (composition du résumé, stats sinon)
  type J = { wr: JoueurWr; team_id: string; numero: number; poste: string | null; stats: Record<string, number> };
  const joueurs = new Map<string, J>();
  s.teamStats.slice(0, 2).forEach((t, i) => {
    for (const p of t.playerStats ?? []) {
      if (!p.player?.id || (p.player.role && p.player.role !== "Player") || p.number == null) continue;
      joueurs.set(p.player.id, { wr: p.player, team_id: equipes[i], numero: Number(p.number), poste: p.position ?? null, stats: p.stats ?? {} });
    }
  });
  (resume?.teams ?? []).slice(0, 2).forEach((t, i) => {
    for (const p of t.teamList?.list ?? []) {
      if (!p.player?.id || p.number == null || joueurs.has(p.player.id) || (p.player.role && p.player.role !== "Player")) continue;
      joueurs.set(p.player.id, { wr: p.player, team_id: equipes[i], numero: Number(p.number), poste: p.position ?? null, stats: {} });
    }
  });
  if (joueurs.size < 20) return { ok: false, raison: "composition incomplète chez World Rugby" };

  if (opts.completer) {
    // feuille officielle déjà en place (LNR) : on ajoute seulement les stats que la LNR ne donne pas (courses, mètres, défenseurs battus…)
    const { data: existantes } = await db.from("player_match_stats")
      .select("player_id, team_id, numero, tackles, line_breaks, offloads, turnovers_won, player:players(first_name, last_name, wr_id)").eq("match_id", m.id);
    type Ex = { player_id: string; team_id: string; numero: number | null; tackles: number | null; line_breaks: number | null; offloads: number | null; turnovers_won: number | null; player: { first_name: string; last_name: string; wr_id: string | null } };
    const ex = (existantes ?? []) as unknown as Ex[];
    const faits = new Set<string>();
    // les remplaçants n'ont pas toujours de numéro sur la feuille LNR : identifiant WR, numéro, puis nom dans l'équipe
    const retrouver = (j: J): Ex | undefined => {
      const libres = ex.filter((x) => x.team_id === j.team_id && !faits.has(x.player_id));
      const nf = norm(nomDe(j.wr.name)), pf = norm(prenomDe(j.wr.name));
      return libres.find((x) => x.player.wr_id === j.wr.id)
        ?? libres.find((x) => x.numero === j.numero && (!x.player.wr_id || x.player.wr_id === j.wr.id))
        ?? (() => { const c = libres.filter((x) => norm(x.player.last_name) === nf && norm(x.player.first_name).slice(0, 1) === pf.slice(0, 1)); return c.length === 1 ? c[0] : undefined; })()
        ?? (() => { const c = libres.filter((x) => norm(x.player.last_name) === nf); return c.length === 1 ? c[0] : undefined; })();
    };
    let maj = 0;
    for (const j of joueurs.values()) {
      const l = retrouver(j);
      if (l) faits.add(l.player_id);
      if (!l || !Object.keys(j.stats).length) continue;
      const d = detail(j.stats);
      const garder = (cle: "tackles" | "line_breaks" | "offloads" | "turnovers_won") => (l[cle] ?? 0) > 0 ? { [cle]: l[cle] } : {};
      const { error } = await db.from("player_match_stats").update({ ...d, ...garder("tackles"), ...garder("line_breaks"), ...garder("offloads"), ...garder("turnovers_won") })
        .eq("match_id", m.id).eq("player_id", l.player_id);
      if (!error) maj++;
      await db.from("players").update({ wr_id: j.wr.id }).eq("id", l.player_id).is("wr_id", null);
    }
    if (!maj) return { ok: false, raison: "joueurs World Rugby non reconnus" };
    await db.rpc("noter_matchs", { p_matchs: [m.id] });
    return { ok: true, joueurs: maj, crees: 0, fil: 0, dom: m.home_score ?? 0, ext: m.away_score ?? 0, conforme: true, detail: true, live };
  }

  // correspondance avec nos joueurs : identifiant WR, ligne existante (même numéro), nom dans le club, nom unique
  const liste = [...joueurs.values()];
  const { data: parId } = await db.from("players").select("id, wr_id").in("wr_id", liste.map((j) => j.wr.id));
  const { data: existantes } = await db.from("player_match_stats").select("player_id, team_id, numero").eq("match_id", m.id);
  const { data: duClub } = await db.from("players").select("id, first_name, last_name, name_key, team_id, wr_id").in("team_id", [m.home_team_id, m.away_team_id]);
  const cles = liste.map((j) => norm(`${prenomDe(j.wr.name)} ${nomDe(j.wr.name)}`));
  const { data: parCle } = await db.from("players").select("id, name_key, wr_id").in("name_key", cles.filter(Boolean));
  const pris = new Set<string>();
  const joueurDe = new Map<string, string>(); // id WR -> id du site
  let crees = 0;
  for (const j of liste) {
    const prenom = prenomDe(j.wr.name), nom = nomDe(j.wr.name);
    const cle = norm(`${prenom} ${nom}`);
    let id = parId?.find((x) => x.wr_id === j.wr.id)?.id;
    if (!id) id = existantes?.find((x) => x.team_id === j.team_id && x.numero === j.numero && !pris.has(x.player_id))?.player_id;
    const club = (duClub ?? []).filter((x) => x.team_id === j.team_id && !x.wr_id && !pris.has(x.id));
    if (!id) id = club.find((x) => x.name_key === cle || norm(`${x.first_name} ${x.last_name}`) === cle)?.id;
    if (!id) {
      const nf = norm(nom);
      const memes = club.filter((x) => norm(x.last_name) === nf && norm(x.first_name).slice(0, 1) === norm(prenom).slice(0, 1));
      if (memes.length === 1) id = memes[0].id;
    }
    if (!id) {
      const memes = (parCle ?? []).filter((x) => x.name_key === cle && !x.wr_id && !pris.has(x.id));
      if (memes.length === 1) id = memes[0].id;
    }
    if (!id && cle) {
      const national = (j.team_id === m.home_team_id ? m.home : m.away).is_national;
      const poste = (j.poste && POSTE[j.poste.toUpperCase()]) || POSTE_NUM[j.numero] || null;
      for (let n = 1; n < 6 && !id; n++) {
        const { data, error } = await db.from("players").insert({
          slug: slugify(`${prenom} ${nom}`) + (n > 1 ? `-${n}` : ""), first_name: prenom || nom, last_name: nom || prenom, team_id: national ? null : j.team_id,
          name_key: cle, source: "wr", in_squad: true, wr_id: j.wr.id, ...(poste ? { position: poste } : {}),
        }).select("id").single();
        if (data) { id = data.id; crees++; }
        else if (error?.code !== "23505" || error.message.includes("name_key") || error.message.includes("wr_id")) break;
      }
    }
    if (!id) continue;
    pris.add(id);
    joueurDe.set(j.wr.id, id);
    if (j.wr.altId) joueurDe.set(j.wr.altId, id);
    await db.from("players").update({ wr_id: j.wr.id }).eq("id", id).is("wr_id", null);
  }

  // points, cartons et remplacements depuis le fil ; minutes depuis les stats (ou le fil en direct)
  const evts = (fil?.timeline ?? []).filter((e) => genre(e)).sort((a, b) => minuteDe(a) - minuteDe(b));
  type L = { player_id: string; team_id: string; numero: number; starter: boolean; minutes: number; tries: number; conversions: number; penalty_goals: number; drop_goals: number; yellow: number; red: number; points: number } & Partial<ReturnType<typeof detail>>;
  const lignes = new Map<string, L>();
  const entree = new Map<string, number | null>();
  for (const j of liste) {
    const pid = joueurDe.get(j.wr.id);
    if (!pid) continue;
    const titulaire = j.numero <= 15;
    lignes.set(pid, {
      player_id: pid, team_id: j.team_id, numero: j.numero, starter: titulaire, minutes: 0, tries: 0, conversions: 0, penalty_goals: 0, drop_goals: 0, yellow: 0, red: 0, points: 0,
      tackles: 0, missed_tackles: 0, carries: 0, metres: 0, line_breaks: 0, offloads: 0, turnovers_won: 0, penalties_conceded: 0,
      ...(Object.keys(j.stats).length ? detail(j.stats) : {}),
    });
    entree.set(pid, titulaire ? 0 : null);
  }
  const fin = live ? Math.max(1, Math.round((s.match.clock?.secs ?? 0) / 60)) : Math.max(80, ...evts.map(minuteDe));
  const joue = new Map<string, number>();
  const sortir = (pid: string, min: number) => { const e = entree.get(pid); if (e != null) { joue.set(pid, (joue.get(pid) ?? 0) + Math.max(0, min - e)); entree.set(pid, null); } };
  const faits: EvtPropose[] = [];
  const idDe = (e: Evt) => (e.playerId && joueurDe.get(e.playerId)) || (e.playerAltId && joueurDe.get(e.playerAltId)) || null;
  const nomWr = new Map(liste.map((j) => [j.wr.id, j.wr.name?.display ?? `${prenomDe(j.wr.name)} ${nomDe(j.wr.name)}`]));
  for (let i = 0; i < evts.length; i++) {
    const e = evts[i], g = genre(e)!, min = minuteDe(e);
    const pid = idDe(e);
    const cote: "home" | "away" = equipes[e.teamIndex ?? 0] === m.away_team_id ? "away" : "home";
    const nom = (e.playerId && nomWr.get(e.playerId)) || "";
    if (g === "out") { if (pid) sortir(pid, min); continue; }
    if (g === "in") {
      if (pid && entree.get(pid) == null) entree.set(pid, min);
      const sortant = evts.slice(Math.max(0, i - 4), i + 5).find((x) => genre(x) === "out" && x.teamIndex === e.teamIndex && minuteDe(x) === min);
      const nomSortant = sortant?.playerId ? nomWr.get(sortant.playerId) : undefined;
      faits.push({ minute: min, cote, player_id: pid, nom: nomSortant ? `${pid ? "" : `${nom} `}remplace ${nomSortant}`.trim() : nom, type: "sub" });
      continue;
    }
    const l = pid ? lignes.get(pid) : undefined;
    if (l) {
      if (g === "try") l.tries++;
      if (g === "conversion") l.conversions++;
      if (g === "penalty") l.penalty_goals++;
      if (g === "drop") l.drop_goals++;
      if (g === "yellow") l.yellow++;
      if (g === "red") { l.red++; sortir(pid!, min); }
    }
    faits.push({ minute: min, cote, player_id: pid, nom, type: g });
  }
  for (const pid of entree.keys()) sortir(pid, fin);
  const sansFil = !evts.length;
  for (const [pid, l] of lignes) {
    const j = liste.find((x) => joueurDe.get(x.wr.id) === pid)!;
    const st = j.stats;
    l.minutes = Math.min(100, Math.round(st.MinutesPlayedTotal != null ? Number(st.MinutesPlayedTotal) : joue.get(pid) ?? 0));
    if (sansFil) {
      // pas de fil : points et cartons depuis les stats du joueur
      l.tries = Math.round(Number(st.Tries) || 0); l.conversions = Math.round(Number(st.Conversions) || 0);
      l.penalty_goals = Math.round(Number(st.PenaltyGoals) || 0); l.drop_goals = Math.round(Number(st.DropGoals) || 0);
      l.yellow = Math.round(Number(st.YellowCards) || 0); l.red = Math.round(Number(st.RedCards) || 0);
    }
    l.points = 5 * l.tries + 2 * l.conversions + 3 * (l.penalty_goals + l.drop_goals);
  }

  // seuls les joueurs entrés en jeu ont une ligne
  const rows = [...lignes.values()]
    .filter((l) => l.starter || l.minutes > 0 || l.points > 0 || l.yellow + l.red > 0 || (l.tackles ?? 0) + (l.carries ?? 0) + (l.passes ?? 0) > 0)
    .map((l) => ({ ...l, match_id: m.id, source: "wr" }));
  if (rows.length < 20) return { ok: false, raison: "joueurs World Rugby non reconnus" };

  const { count: autres } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).not("source", "in", "(espn,wr)");
  const { count: manuels } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).is("source", null);
  if ((autres || manuels) && !opts.remplacer) return { ok: false, raison: "déjà saisi à la main ou par la LNR" };
  // les lignes d'une feuille automatique précédente (ESPN, World Rugby) qui ne sont plus valables disparaissent
  await db.from("player_match_stats").delete().eq("match_id", m.id).in("source", ["espn", "wr"]).not("player_id", "in", `(${rows.map((r) => r.player_id).join(",")})`);
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await db.from("player_match_stats").upsert(rows.slice(i, i + 50), { onConflict: "match_id,player_id" });
    if (error) throw new Error(error.message);
  }

  // homme du match officiel (jamais à la place d'un choix fait au studio)
  const motmWr = resume?.motm?.motm?.id ?? liste.find((j) => j.wr.isPlayerOfTheMatch)?.wr.id;
  const motm = motmWr ? joueurDe.get(motmWr) : undefined;
  if (motm) await db.from("matches").update({ homme_du_match: motm }).eq("id", m.id).is("homme_du_match", null);

  await db.rpc("noter_matchs", { p_matchs: [m.id] });
  const nFil = faits.length ? await ecrireFil(db, m, faits, "wr") : 0;

  const pts = (cote: "home" | "away") => rows.filter((r) => r.team_id === (cote === "home" ? m.home_team_id : m.away_team_id)).reduce((t, r) => t + r.points, 0)
    + faits.filter((e) => e.type === "penalty_try" && e.cote === cote).length * 7;
  const scores = s.match.scores ?? [];
  const officiel = (i: 0 | 1) => (scores.length === 2 ? Number(scores[cible.inverse ? 1 - i : i]) : null);
  // en direct, le score de l'API stats est en retard sur le fil (0-0 alors qu'un essai transformé est au fil) :
  // on prend le plus haut des deux, et jamais moins que le score déjà affiché (un score ne redescend pas)
  const enDirect = (i: 0 | 1, cote: "home" | "away", avant: number | null) => Math.max(officiel(i) ?? 0, pts(cote), avant ?? 0);
  const dom = live ? enDirect(0, "home", m.home_score) : officiel(0) ?? pts("home");
  const ext = live ? enDirect(1, "away", m.away_score) : officiel(1) ?? pts("away");
  // essais : fil du match, ou à défaut la somme des essais des joueurs (fil absent chez World Rugby)
  const essais = (cote: "home" | "away") => faits.length
    ? faits.filter((e) => (e.type === "try" || e.type === "penalty_try") && e.cote === cote).length
    : rows.filter((r) => r.team_id === (cote === "home" ? m.home_team_id : m.away_team_id)).reduce((t, r) => t + r.tries, 0);
  await db.from("matches").update({ home_tries: essais("home"), away_tries: essais("away") }).eq("id", m.id);
  // le classement n'est recalculé que pour un match récent (un vieux match ne change pas le classement en cours)
  if (m.competition_id && Date.now() - new Date(m.kickoff_at).getTime() < 60 * 86400e3) await db.rpc("appliquer_bonus_offensif", { p_comp: m.competition_id });
  if (live) {
    // chrono : World Rugby ne donne pas d'horloge qui tourne (son « clock » reste figé) ; on date nous-mêmes le début de
    // chaque mi-temps, au plus tôt compatible avec le dernier fait de jeu de la période (une relecture par minute)
    const maintenant = Date.now();
    const evts = fil?.timeline ?? [];
    const dernier = (phase: string) => Math.max(0, ...evts.filter((e) => (e.phase ?? "").toUpperCase() === phase).map((e) => e.time?.secs ?? 0));
    const { data: p } = await db.from("matches").select("periode1_debut, periode1_fin, periode2_debut").eq("id", m.id).single();
    const plusTot = (avant: string | null | undefined, candidat: number) => {
      const c = new Date(candidat).toISOString();
      return !avant || new Date(avant).getTime() > candidat ? c : avant;
    };
    const chrono: Record<string, string> = {};
    const mt = statut.includes("HT");
    const deuxieme = statut === "L2" || dernier("L2") > 0;
    if (!deuxieme) {
      if (!mt) chrono.periode1_debut = plusTot(p?.periode1_debut, maintenant - dernier("L1") * 1000);
      if (mt && !p?.periode1_fin) chrono.periode1_fin = new Date(maintenant).toISOString();
    } else {
      chrono.periode2_debut = plusTot(p?.periode2_debut, maintenant - Math.max(0, dernier("L2") - 2400) * 1000);
      if (!p?.periode1_debut) chrono.periode1_debut = new Date(new Date(m.kickoff_at).getTime()).toISOString();
      if (!p?.periode1_fin) chrono.periode1_fin = chrono.periode2_debut;
    }
    for (const [k, v] of Object.entries(chrono)) if (v === (p as Record<string, string | null> | null)?.[k]) delete chrono[k];
    const secs = Math.max(...evts.map((e) => e.time?.secs ?? 0), 0);
    const horloge = secs > 0 ? `${Math.floor(secs / 60)}'` : null;
    const iso = new Date(maintenant).toISOString();
    await db.from("matches").update({ home_score: dom, away_score: ext, feuille_tentee_at: iso, ...chrono, ...(horloge ? { clock: horloge, clock_at: iso } : {}) }).eq("id", m.id);
  }
  const detailOk = rows.some((r) => (r.tackles ?? 0) > 0);
  return { ok: true, joueurs: rows.length, crees, fil: nFil, dom, ext, conforme: dom === m.home_score && ext === m.away_score, detail: detailOk, live };
}
