import type { SupabaseClient } from "@supabase/supabase-js";
import { ecrireFil, type EvtPropose } from "@/lib/fil";
import type { MatchLocal } from "./espn";

/**
 * Feuilles de match officielles de la LNR (top14.lnr.fr, prod2.lnr.fr).
 * Les pages contiennent leurs données en JSON (composants Vue « :prop='…' ») :
 *   - feuille de match : faits de jeu (points, cartons), remplacements, chrono exact des deux mi-temps ;
 *   - statistiques : pour chaque joueur, temps de jeu, essais, plaquages, franchissements, passes après contact, ballons grattés ;
 *   - compositions : numéros de maillot.
 */
const UA = "Mozilla/5.0 (compatible; AmbianceRugby/1.0; +https://ambiance-rugby.fr)";
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const VIDES = new Set(["stade", "rugby", "club", "union", "section", "olympique", "racing", "pays", "sporting", "hérault", "herault", "us", "usa", "ca", "su", "rc", "as", "asm", "fc", "cs", "lou"]);

async function page(url: string) {
  // paramètre unique + en-têtes no-cache : sans eux, le cache de la LNR peut servir une page vieille de plusieurs minutes
  const frais = `${url}${url.includes("?") ? "&" : "?"}_=${Math.floor(Date.now() / 1000)}`;
  const r = await fetch(frais, { cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { "user-agent": UA, accept: "text/html", "cache-control": "no-cache", pragma: "no-cache" } });
  if (!r.ok) throw new Error(`LNR : HTTP ${r.status}`);
  return r.text();
}

/** Valeurs JSON des attributs « :nom='…' » d'une page, par nom, dans l'ordre. */
function blocs(html: string) {
  const out = new Map<string, unknown[]>();
  const re = /:([a-z][a-z0-9-]*)='([^']*)'|:([a-z][a-z0-9-]*)="([^"]*)"/g;
  let a: RegExpExecArray | null;
  while ((a = re.exec(html))) {
    const nom = a[1] ?? a[3];
    const brut = decode(a[2] ?? a[4] ?? "").trim();
    if (!/^[[{]/.test(brut)) continue;
    try { out.set(nom, [...(out.get(nom) ?? []), JSON.parse(brut)]); } catch { /* pas du JSON */ }
  }
  return out;
}

type JoueurLnr = { firstName?: string; lastName?: string; name?: string; url?: string; photo?: { original?: string }; image?: { original?: string } };
type Fait = { id: string; type?: string; subtype?: string; slugType?: string; slugSubType?: string; club?: "home" | "away"; period?: number; minute?: number; additionalMinute?: number; score?: [number, number]; player?: JoueurLnr; conversionPlayer?: JoueurLnr };
type Rempl = { id: string; club?: "home" | "away"; minute?: number; type?: string; in?: JoueurLnr; out?: JoueurLnr };
type Ligne = { player: JoueurLnr; position?: string; tempsJeu?: string; nbPoints?: string; nbEssais?: string; offload?: string; lineBreak?: string; breakdownSteals?: string; totalSuccessfulTackles?: string; nbCartonsJaunes?: string; nbCartonsOranges?: string; nbCartonsRouges?: string };
type Timer = { firstPeriodStartDate?: string | null; firstPeriodEndDate?: string | null; secondPeriodStartDate?: string | null; secondPeriodEndDate?: string | null };

const idLnr = (j?: JoueurLnr) => j?.url?.match(/\/joueur\/([^/?#]+)/)?.[1] ?? null;
const nomComplet = (j?: JoueurLnr) => (j?.firstName || j?.lastName ? `${j?.firstName ?? ""} ${j?.lastName ?? ""}` : j?.name ?? "").replace(/\s+/g, " ").trim();
const joli = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
/** Premier prénom d'après l'identifiant LNR (« 12609-regis-desire-omby » + « Omby » → « Regis »). */
function prenomDuSlug(id: string, nom: string | null | undefined): string | null {
  const morceaux = id.split("-").slice(1).filter(Boolean);
  const fin = norm(nom).split(" ").filter(Boolean);
  if (!morceaux.length || !fin.length) return null;
  // le nom peut perdre ses espaces dans l'identifiant (« N'Koa » → « nkoa »)
  for (let k = 1; k < morceaux.length; k++) if (morceaux.slice(k).join("") === fin.join("")) return joli(morceaux[0]);
  return null;
}

/** Journée LNR correspondant à notre « round » (numéro, ou phase finale). */
export function journees(round: string | null) {
  if (!round) return [];
  if (/^\d+$/.test(round)) return [`j${round}`];
  if (/quarter/i.test(round)) return ["barrages", "quarts-de-finale", "quarts"];
  if (/semi/i.test(round)) return ["demi-finales", "demi-finale"];
  if (/final/i.test(round)) return ["finale"];
  return [];
}

/** Retrouve l'adresse de la feuille de match LNR dans le calendrier de la journée. */
// un mot utile : 3 lettres ou plus, ou un numéro (« 92 » pour le Racing 92 que la LNR écrit « racing-92 »)
const utile = (w: string) => /^\d{2,}$/.test(w) || w.length >= 3;
const mots = (t: MatchLocal["home"]) => [t.name, t.short_name, ...(t.aliases ?? [])].flatMap((n) => norm(n).split(" ")).filter((w) => utile(w) && !VIDES.has(w));
const colle = (t: MatchLocal["home"], slug: string) => mots(t).some((w) => slug.split("-").some((s) => utile(s) && (/^\d+$/.test(w) ? s === w : w.startsWith(s) || s.startsWith(w))));
/** Le lien LNR « /feuille-de-match/…/12345-toulouse-racing-92 » correspond-il à ce match ? */
export const lienCorrespond = (lien: string, dom: MatchLocal["home"], ext: MatchLocal["away"]) => { const sl = lien.split("/").pop()!.replace(/^\d+-/, ""); return colle(dom, sl) && colle(ext, sl); };

/** Nom de chaîne tel qu'on l'affiche (« Canal + Sport 360 » → « Canal+ Sport 360 »). */
export const nomChaine = (n: string) => decode(n).replace(/Canal\s*\+\s*/gi, "Canal+ ").replace(/\s+/g, " ").trim();

/** Matchs d'une journée du calendrier LNR, avec les chaînes qui les diffusent (vide si pas encore annoncées). */
export async function lireDiffuseursLnr(site: string, saison: string, journee: string) {
  const html = await page(`${site}/calendrier-et-resultats/${saison}/${journee}`);
  const out: { lien: string; chaines: string[] }[] = [];
  for (const bloc of html.split(/class="match-calendar-line[ "]/).slice(1)) {
    const lien = bloc.match(/\/feuille-de-match\/[a-z0-9-]+\/[a-z0-9-]+\/\d+-[a-z0-9-]+/)?.[0];
    if (!lien) continue;
    const chaines = [...new Set([...bloc.matchAll(/<img[^>]*alt="([^"]+)"[^>]*class="match-line__broadcaster/g)].map((x) => nomChaine(x[1])))];
    out.push({ lien: site + lien, chaines });
  }
  return out;
}

export async function trouverMatchLnr(site: string, saison: string, round: string | null, dom: MatchLocal["home"], ext: MatchLocal["away"]) {
  for (const j of journees(round)) {
    const html = await page(`${site}/calendrier-et-resultats/${saison}/${j}`).catch(() => "");
    const liens = [...new Set([...html.matchAll(/\/feuille-de-match\/[a-z0-9-]+\/[a-z0-9-]+\/\d+-[a-z0-9-]+/g)].map((x) => x[0]))];
    const bon = liens.find((l) => lienCorrespond(l, dom, ext));
    if (bon) return site + bon;
  }
  return null;
}

export type ResultatLnr = { ok: true; joueurs: number; crees: number; fil: number; dom: number; ext: number; conforme: boolean; enCours: boolean; fini: boolean } | { ok: false; raison: string };

/**
 * Lit la feuille de match LNR et enregistre stats joueurs, fil du match, chrono et (en direct) le score.
 * Les lignes saisies à la main ne sont jamais écrasées sans « remplacer ».
 */
export async function importerFeuilleLnr(db: SupabaseClient, m: MatchLocal & { round?: string | null; season?: string | null; lnr_url?: string | null; competition: { lnr_site?: string | null } }, opts: { remplacer?: boolean } = {}): Promise<ResultatLnr> {
  const site = m.competition.lnr_site;
  if (!site) return { ok: false, raison: "compétition non suivie par la LNR" };
  let url = m.lnr_url ?? null;
  if (!url) {
    url = await trouverMatchLnr(site, m.season ?? "", m.round ?? null, m.home, m.away);
    if (!url) return { ok: false, raison: "feuille LNR non trouvée dans le calendrier" };
    await db.from("matches").update({ lnr_url: url }).eq("id", m.id);
  }

  const [principale, stats, compos] = await Promise.all([page(url), page(`${url}/statistiques-du-match`).catch(() => ""), page(`${url}/compositions`).catch(() => "")]);
  const b = blocs(principale);
  const timer = (b.get("timer")?.[0] ?? {}) as Timer;
  const faits = ((b.get("game-facts")?.[0] ?? []) as Fait[]).filter((f) => f && f.id);
  const rempl = ((b.get("items") ?? []) as Rempl[][]).flat().filter((x) => x?.type === "Remplacement");
  const classements = (blocs(stats).get("ranking") ?? []) as Ligne[][];

  // chrono exact des mi-temps
  const t = (x?: string | null) => (x ? new Date(x).toISOString() : null);
  const chrono = { periode1_debut: t(timer.firstPeriodStartDate), periode1_fin: t(timer.firstPeriodEndDate), periode2_debut: t(timer.secondPeriodStartDate), periode2_fin: t(timer.secondPeriodEndDate) };
  // « en cours » seulement pour un match commencé il y a moins de 4 h : les vieilles feuilles n'ont souvent pas d'heure de fin
  const recent = Date.now() - new Date((m as { kickoff_at?: string }).kickoff_at ?? 0).getTime() < 4 * 3600e3;
  const enCours = recent && !!chrono.periode1_debut && !chrono.periode2_fin;
  const fini = !!chrono.periode2_fin;
  if (!chrono.periode1_debut && !faits.length && !classements.length) return { ok: false, raison: "match pas encore commencé sur la LNR" };

  // côté de chaque classement de joueurs : on le reconnaît grâce aux remplacements et aux faits de jeu
  const cote = new Map<string, "home" | "away">();
  for (const r of rempl) for (const j of [r.in, r.out]) { const id = idLnr(j); if (id && r.club) cote.set(id, r.club); }
  for (const f of faits) for (const j of [f.player, f.conversionPlayer]) { const id = idLnr(j); if (id && f.club) cote.set(id, f.club); }
  // club réel (effectifs LNR) de chaque joueur cité : le camp annoncé par le flux en direct peut être faux
  const citesIds = [...new Set([...rempl.flatMap((r) => [r.in, r.out]), ...faits.flatMap((f) => [f.player, f.conversionPlayer])].map((j) => idLnr(j)).filter(Boolean) as string[])];
  const clubCites = await clubsConnus(db, citesIds, m.home_team_id, m.away_team_id);
  // le club connu l'emporte sur le camp annoncé par le flux (qui sert encore à orienter les compositions)
  const annonce = new Map(cote);
  for (const [id, c] of clubCites) cote.set(id, c);
  const equipes: { side: "home" | "away"; lignes: Ligne[] }[] = classements.map((ls, i) => {
    const votes = ls.map((l) => cote.get(idLnr(l.player) ?? "")).filter(Boolean);
    const home = votes.filter((v) => v === "home").length, away = votes.filter((v) => v === "away").length;
    return { side: home > away ? "home" : away > home ? "away" : i === 0 ? "home" : "away", lignes: ls };
  });
  const teamId = (s: "home" | "away") => (s === "home" ? m.home_team_id : m.away_team_id);

  // numéros de maillot et noms complets (compositions)
  const numeros = new Map<string, number>();
  for (const x of compos.matchAll(/href="[^"]*\/joueur\/([^"/]+)"[\s\S]{0,600}?player-pitch__number">\s*(\d+)\s*</g)) numeros.set(x[1], Number(x[2]));
  const nomsCompos = new Map<string, { firstName: string; lastName: string }>();
  for (const x of compos.matchAll(/\/joueur\/([^"/]+)"[\s\S]{0,800}?__first-name">([^<]*)<\/span>[\s\S]{0,200}?__last-name">([^<]*)</g)) {
    const [first, last] = [decode(x[2]).trim(), decode(x[3]).trim()];
    if (first && last) nomsCompos.set(x[1], { firstName: first, lastName: last });
  }
  // le classement des stats abrège parfois (« R. NACIKA ») : on complète avec les compositions et le fil
  const complet = (id: string, j: JoueurLnr): JoueurLnr => {
    if (j.firstName && j.lastName && !/^\p{L}\.$/u.test(j.firstName)) return j;
    const c = nomsCompos.get(id);
    if (c) return { ...j, ...c };
    const m = (j.name ?? "").match(/^(\p{L})\.\s+(.+)$/u);
    const base = m ? { ...j, firstName: `${m[1]}.`, lastName: m[2] } : j;
    // dernier recours : l'identifiant LNR porte l'état civil complet (« 13648-alvaro-garcia-iandolino »)
    const prenom = prenomDuSlug(id, base.lastName);
    return prenom && (!base.firstName || /^\p{L}\.$/u.test(base.firstName)) && (!base.firstName || norm(prenom)[0] === norm(base.firstName)[0])
      ? { ...base, firstName: prenom } : base;
  };

  // les 23 de chaque équipe d'après la composition officielle
  const groupesCompo = analyserCompos(compos);
  const compo = groupesCompo
    ? orienterCompos(groupesCompo, await clubsConnus(db, [...groupesCompo[0], ...groupesCompo[1]].map((j) => j.lnrId), m.home_team_id, m.away_team_id), annonce)
    : null;
  const coteCompo = new Map<string, "home" | "away">();
  if (compo) for (const [liste, side] of [[compo.dom, "home"], [compo.ext, "away"]] as const) for (const c of liste) { coteCompo.set(c.lnrId, side); if (!numeros.has(c.lnrId)) numeros.set(c.lnrId, c.numero); }

  // tous les joueurs cités, avec leur côté
  const joueurs = new Map<string, { j: JoueurLnr; side: "home" | "away" }>();
  // noms complets du fil (remplacements, buteurs) en priorité sur le classement abrégé
  const duFil = new Map<string, JoueurLnr>();
  for (const j of [...rempl.flatMap((r) => [r.in, r.out]), ...faits.flatMap((f) => [f.player, f.conversionPlayer])]) { const id = idLnr(j); if (id && j?.firstName) duFil.set(id, j); }
  for (const e of equipes) for (const l of e.lignes) { const id = idLnr(l.player); if (id) joueurs.set(id, { j: complet(id, { ...l.player, ...(duFil.get(id) ?? {}) }), side: e.side }); }
  for (const [id, side] of cote) if (!joueurs.has(id) && duFil.has(id)) joueurs.set(id, { j: complet(id, duFil.get(id)!), side });
  // tant que la LNR n'a pas publié le classement des stats (ou pour les vieux matchs qui n'en ont pas), la composition
  // donne quand même tous les joueurs du match : titulaires et remplaçants entrés en jeu
  if (compo) for (const liste of [compo.dom, compo.ext]) for (const c of liste) {
    if (joueurs.has(c.lnrId)) continue;
    const j: JoueurLnr = { ...(duFil.get(c.lnrId) ?? {}), firstName: duFil.get(c.lnrId)?.firstName ?? c.prenom, lastName: duFil.get(c.lnrId)?.lastName ?? c.nom } as JoueurLnr;
    joueurs.set(c.lnrId, { j: complet(c.lnrId, j), side: coteCompo.get(c.lnrId)! });
  }

  // correspondance avec nos joueurs : identifiant LNR, puis nom dans le club, puis nom n'importe où ; sinon création
  const ids = [...joueurs.keys()];
  const { data: parId } = ids.length ? await db.from("players").select("id, lnr_id, photo_source, verrou, source, first_name").in("lnr_id", ids) : { data: [] };
  const { data: duClub } = await db.from("players").select("id, first_name, last_name, name_key, team_id, lnr_id, photo_source, verrou").in("team_id", [m.home_team_id, m.away_team_id]);
  const cles = ids.map((id) => norm(nomComplet(joueurs.get(id)!.j)));
  const { data: parCle } = await db.from("players").select("id, name_key, lnr_id, photo_source, verrou").in("name_key", cles.filter(Boolean));
  const notreId = new Map<string, string>();
  let crees = 0;
  for (const id of ids) {
    const { j, side } = joueurs.get(id)!;
    const nom = nomComplet(j);
    const cle = norm(nom);
    const team = teamId(side);
    let p: { id: string; photo_source?: string | null; verrou?: boolean; lnr_id?: string | null } | undefined = parId?.find((x) => x.lnr_id === id);
    if (!p) p = (duClub ?? []).find((x) => x.team_id === team && !x.lnr_id && (x.name_key === cle || norm(`${x.first_name} ${x.last_name}`) === cle));
    if (!p) {
      // même nom de famille dans le club : même initiale, ou seul joueur de ce nom
      const famille = norm(j.lastName);
      const memeNom = (duClub ?? []).filter((x) => x.team_id === team && !x.lnr_id && famille && norm(x.last_name) === famille);
      const memeInitiale = memeNom.filter((x) => norm(x.first_name).slice(0, 1) === norm(j.firstName).slice(0, 1));
      if (memeInitiale.length === 1) p = memeInitiale[0];
      else if (memeNom.length === 1) p = memeNom[0];
    }
    if (!p) p = parCle?.find((x) => x.name_key === cle && !x.lnr_id);
    if (!p && nom) {
      for (let n = 1; n < 6 && !p; n++) {
        const slug = norm(nom).replace(/ /g, "-") + (n > 1 ? `-${n}` : "");
        const { data, error } = await db.from("players").insert({
          slug, first_name: joli(j.firstName ?? nom.split(" ")[0] ?? ""), last_name: joli(j.lastName ?? nom.split(" ").slice(1).join(" ")),
          team_id: team, name_key: cle || null, source: "lnr", lnr_id: id,
          // joueur découvert sur une vieille feuille : il a pu quitter le club depuis, l'effectif officiel LNR tranchera
          in_squad: Date.now() - new Date(m.kickoff_at).getTime() < 45 * 86400e3,
        }).select("id").single();
        if (data) { p = { id: data.id, photo_source: null, verrou: false }; crees++; }
        else if (error?.code !== "23505" || error.message.includes("name_key")) break;
      }
    }
    if (!p) continue;
    notreId.set(id, p.id);
    // photo officielle LNR si on n'a rien de plus sûr ; identifiant LNR mémorisé ; club d'après la feuille du jour
    const photo = j.photo?.original ?? j.image?.original;
    const patch: Record<string, unknown> = {};
    if (!p.lnr_id) patch.lnr_id = id;
    if ((p as { source?: string }).source === "lnr" && j.firstName && !/^\p{L}\.$/u.test(j.firstName) && /^\p{L}\.$/u.test((p as { first_name?: string }).first_name ?? "")) patch.first_name = joli(j.firstName);
    if (photo && !p.verrou && (!p.photo_source || p.photo_source === "TheSportsDB")) { patch.photo_url = photo; patch.photo_source = "LNR"; }
    // (jamais d'un des deux clubs du match vers l'autre : c'est l'effectif LNR qui tranche, pas une feuille mal lue)
    const clubActuel = (duClub ?? []).find((x) => x.id === p!.id)?.team_id;
    const autreCamp = clubActuel && clubActuel !== team && [m.home_team_id, m.away_team_id].includes(clubActuel);
    if (!p.verrou && !autreCamp && Date.now() - new Date(m.kickoff_at).getTime() < 45 * 86400e3) { patch.team_id = team; patch.in_squad = true; }
    if (Object.keys(patch).length) await db.from("players").update(patch).eq("id", p.id);
  }

  // stats par joueur
  const entrants = new Set(rempl.map((r) => idLnr(r.in)).filter(Boolean) as string[]);
  const n = (s?: string) => (s && /^\d+$/.test(s) ? Number(s) : 0);
  const lignes = new Map<string, Record<string, unknown>>();
  const ligne = (id: string, side: "home" | "away") => {
    const pid = notreId.get(id);
    if (!pid) return null;
    if (!lignes.has(pid)) lignes.set(pid, { match_id: m.id, player_id: pid, team_id: teamId(side), numero: numeros.get(id) ?? null, starter: !entrants.has(id), minutes: 0, tries: 0, conversions: 0, penalty_goals: 0, drop_goals: 0, yellow: 0, red: 0, tackles: 0, line_breaks: 0, offloads: 0, turnovers_won: 0, source: "lnr" });
    return lignes.get(pid)!;
  };
  for (const e of equipes) for (const l of e.lignes) {
    const id = idLnr(l.player); if (!id) continue;
    const r = ligne(id, e.side); if (!r) continue;
    const min = n(l.tempsJeu);
    Object.assign(r, {
      minutes: Math.min(100, min), tries: n(l.nbEssais), tackles: n(l.totalSuccessfulTackles), line_breaks: n(l.lineBreak), offloads: n(l.offload),
      turnovers_won: n(l.breakdownSteals), yellow: n(l.nbCartonsJaunes), red: n(l.nbCartonsRouges) + n(l.nbCartonsOranges), starter: !entrants.has(id) && min > 0,
    });
  }

  // sans classement des stats : temps de jeu déduit de la composition et des remplacements
  if (compo && (fini || !recent)) {
    const fin = 80;
    const sortie = new Map<string, number>(), entree = new Map<string, number>();
    for (const r of rempl) {
      const o = idLnr(r.out), i = idLnr(r.in);
      if (o && !sortie.has(o)) sortie.set(o, Math.min(fin, r.minute ?? fin));
      if (i && !entree.has(i)) entree.set(i, Math.min(fin, r.minute ?? fin));
    }
    for (const liste of [compo.dom, compo.ext]) for (const c of liste) {
      const side = coteCompo.get(c.lnrId)!;
      const r = ligne(c.lnrId, side);
      if (!r || Number(r.minutes) > 0) continue;
      const titulaire = c.numero <= 15;
      const debut = titulaire ? 0 : entree.get(c.lnrId);
      if (debut == null) continue; // remplaçant resté sur le banc
      const finJ = sortie.get(c.lnrId) ?? fin;
      Object.assign(r, { minutes: Math.max(1, finJ - debut), starter: titulaire });
    }
  }

  // fil du match (et buteurs, absents du classement)
  const fil: EvtPropose[] = [];
  // en direct, la LNR publie parfois un fait sans minute : on prend celle du fait voisin (la transformation qui suit, sinon le fait précédent)
  // (défini plus bas) temps de jeu écoulé
  let jeuEcoule = 130;
  const minuteVoisine = (f: Fait): number => {
    const i = faits.indexOf(f);
    const ok = (g: Fait) => g.minute != null && g.minute + (g.additionalMinute ?? 0) <= jeuEcoule;
    for (let k = i + 1; k < faits.length; k++) if (ok(faits[k])) return faits[k].minute! + (faits[k].additionalMinute ?? 0);
    for (let k = i - 1; k >= 0; k--) if (ok(faits[k])) return faits[k].minute! + (faits[k].additionalMinute ?? 0);
    return 0;
  };
  // en direct, une minute plus grande que le temps de jeu écoulé est une erreur de saisie (ex. carton à la 37e noté « 80' ») :
  // on prend alors celle du fait voisin
  jeuEcoule = (() => {
    if (!enCours) return 130;
    const depuis = (d: string) => (Date.now() - new Date(d).getTime()) / 60000;
    if (chrono.periode2_debut) return 40 + depuis(chrono.periode2_debut) + 5;
    if (chrono.periode1_debut) return Math.min(50, depuis(chrono.periode1_debut) + 5);
    return 130;
  })();
  const minuteBrute = (f: Fait) => (f.minute == null ? null : f.minute + (f.additionalMinute ?? 0));
  const minute = (f: Fait) => { const b = minuteBrute(f); return Math.min(130, b == null || b > jeuEcoule ? minuteVoisine(f) : b); };
  const triesFil = new Map<string, number>();
  for (const f of faits) {
    const sst = norm(f.slugSubType ?? f.subtype);
    const st = norm(f.slugType ?? f.type);
    // la composition fait foi sur le camp d'un joueur : le côté d'un fait en direct peut être faux (transformation rangée chez l'adversaire)
    const side: "home" | "away" = coteCompo.get(idLnr(f.player) ?? "") ?? clubCites.get(idLnr(f.player) ?? "") ?? (f.club === "away" ? "away" : "home");
    const pid = notreId.get(idLnr(f.player) ?? "") ?? null;
    const nom = nomComplet(f.player);
    let type: string | null = null;
    if (st.includes("exclusion") || st.includes("carton")) type = sst.includes("jaune") ? "yellow" : "red";
    else if (sst.includes("essai") && sst.includes("penalite")) type = "penalty_try";
    // « transformation » d'abord : la LNR peut écrire « transformation de l'essai », qui contient aussi « essai »
    else if (sst.includes("transformation") || st.includes("transformation")) type = "conversion";
    else if (sst.includes("essai")) type = "try";
    else if (sst.includes("penalite")) type = "penalty";
    else if (sst.includes("drop")) type = "drop";
    if (!type) continue;
    fil.push({ minute: minute(f), cote: side, player_id: pid, nom: pid ? "" : joli(nom), type });
    const id = idLnr(f.player);
    if (id) {
      const r = ligne(id, side);
      if (r) {
        if (type === "penalty") r.penalty_goals = Number(r.penalty_goals) + 1;
        if (type === "drop") r.drop_goals = Number(r.drop_goals) + 1;
        if (type === "conversion") r.conversions = Number(r.conversions) + 1;
        if (type === "try") triesFil.set(r.player_id as string, (triesFil.get(r.player_id as string) ?? 0) + 1);
      }
    }
    if (f.conversionPlayer) {
      const cid = idLnr(f.conversionPlayer);
      const cpid = notreId.get(cid ?? "") ?? null;
      fil.push({ minute: minute(f), cote: coteCompo.get(cid ?? "") ?? clubCites.get(cid ?? "") ?? side, player_id: cpid, nom: cpid ? "" : joli(nomComplet(f.conversionPlayer)), type: "conversion" });
      const r = cid ? ligne(cid, side) : null;
      if (r) r.conversions = Number(r.conversions) + 1;
    }
  }
  // en direct, le classement des stats peut être en retard : les essais du fil font foi s'ils sont plus nombreux
  for (const [pid, nb] of triesFil) { const r = lignes.get(pid); if (r && Number(r.tries) < nb) r.tries = nb; }
  for (const r of rempl) {
    const pin = notreId.get(idLnr(r.in) ?? "") ?? null;
    const sortant = nomComplet(r.out);
    const idIn = idLnr(r.in) ?? idLnr(r.out) ?? "";
    fil.push({ minute: Math.min(130, r.minute ?? 0), cote: coteCompo.get(idIn) ?? clubCites.get(idIn) ?? (r.club === "away" ? "away" : "home"), player_id: pin, nom: `${pin ? "" : `${joli(nomComplet(r.in))} `}remplace ${joli(sortant)}`.trim(), type: "sub" });
  }
  fil.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  // score : dernier score du fil (transformations comprises)
  const dernier = [...faits].reverse().find((f) => Array.isArray(f.score));
  let dom = dernier?.score?.[0] ?? 0, ext = dernier?.score?.[1] ?? 0;
  // contrôle : les points du fil, camp par camp. Si la LNR a le même total mais une autre répartition
  // (camps mélangés dans son flux), ou l'ordre inverse, les points du fil font foi.
  const VALEUR: Record<string, number> = { try: 5, penalty_try: 7, conversion: 2, penalty: 3, drop: 3 };
  const pts = (s: "home" | "away") => fil.filter((e) => e.cote === s).reduce((n, e) => n + (VALEUR[e.type] ?? 0), 0);
  const [pd, pe] = [pts("home"), pts("away")];
  if (pd + pe > 0 && pd + pe === dom + ext && (pd !== dom || pe !== ext)) { dom = pd; ext = pe; }
  const essais = (s: "home" | "away") => fil.filter((e) => (e.type === "try" || e.type === "penalty_try") && e.cote === s).length;

  // enregistrement
  const rows = [...lignes.values()].filter((r) => Number(r.minutes) > 0 || r.starter || Number(r.tries) + Number(r.conversions) + Number(r.penalty_goals) + Number(r.drop_goals) + Number(r.yellow) + Number(r.red) > 0);
  if (rows.length) {
    const { count: manuels } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).is("source", null);
    if (manuels && !opts.remplacer) return { ok: false, raison: "déjà saisi à la main" };
    // une relecture ne doit jamais appauvrir une feuille : si on a déjà plus de joueurs, on garde l'existant
    const { count: existants } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", m.id).in("source", ["espn", "claude", "lnr"]);
    if (!opts.remplacer && !enCours && (existants ?? 0) > rows.length) return { ok: false, raison: `feuille LNR incomplète (${rows.length} joueurs, ${existants} déjà enregistrés)` };
    // la feuille officielle remplace les lectures automatiques précédentes (ESPN, Claude)
    await db.from("player_match_stats").delete().eq("match_id", m.id).in("source", ["espn", "claude", "lnr"]);
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await db.from("player_match_stats").upsert(rows.slice(i, i + 100), { onConflict: "match_id,player_id" });
      if (error) throw new Error(error.message);
    }
  }
  if (rows.length) await db.rpc("noter_matchs", { p_matchs: [m.id] });
  const nFil = fil.length ? await ecrireFil(db, m, fil, "lnr") : 0;
  await db.from("matches").update({
    ...chrono, lnr_url: url, home_tries: essais("home"), away_tries: essais("away"),
    // en direct (ou à la fin d'un direct) : score de la feuille ; feuille_tentee_at signe l'écriture pour la base
    ...(enCours || fini ? { home_score: dom, away_score: ext, feuille_tentee_at: new Date().toISOString() } : {}),
    // coup d'envoi vu sur la feuille avant API-Sports : le match passe en direct (et la notification part)
    ...(enCours && m.status === "scheduled" ? { status: "live" } : {}),
  }).eq("id", m.id);
  if (m.competition_id && fini) await db.rpc("appliquer_bonus_offensif", { p_comp: m.competition_id });
  return { ok: true, joueurs: rows.length, crees, fil: nFil, dom, ext, conforme: m.home_score === dom && m.away_score === ext, enCours, fini };
}

/** Sélection Supabase d'un match prêt pour importerFeuilleLnr / importerFeuilleEspn. */
export const SELECT_MATCH_FEUILLE = "id, competition_id, kickoff_at, home_score, away_score, home_team_id, away_team_id, espn_event_id, wr_id, lnr_url, round, season, status, home:teams!matches_home_team_id_fkey(id,name,short_name,abbreviation,aliases,espn_id,wr_id,is_national), away:teams!matches_away_team_id_fkey(id,name,short_name,abbreviation,aliases,espn_id,wr_id,is_national), competition:competitions(name, espn_league, lnr_site, wr_ok)";

export type JoueurCompo = { lnrId: string; numero: number; prenom: string; nom: string; photo: string | null };

/**
 * Composition officielle publiée par la LNR (2 jours avant le match environ) : les 23 de chaque équipe,
 * dans l'ordre de la page (l'équipe qui reçoit d'abord). Mise en cache 30 minutes.
 */
export async function lireCompositionLnr(url: string, equipes?: { db: SupabaseClient; dom: string; ext: string }): Promise<{ dom: JoueurCompo[]; ext: JoueurCompo[] } | null> {
  const r = await fetch(`${url}/compositions`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(15_000), headers: { "user-agent": UA, accept: "text/html" } }).catch(() => null);
  if (!r?.ok) return null;
  const g = analyserCompos(await r.text());
  if (!g) return null;
  const club = equipes ? await clubsConnus(equipes.db, [...g[0], ...g[1]].map((j) => j.lnrId), equipes.dom, equipes.ext) : new Map();
  return orienterCompos(g, club);
}

/**
 * Lit la page « compositions » de la LNR et rend les deux équipes, dans l'ordre où elles apparaissent.
 * La page peut répéter les joueurs (titulaires des deux camps, puis listes complètes avec remplaçants) et
 * ne met pas toujours l'équipe qui reçoit en premier : on découpe en blocs à chaque retour au n°1, puis on
 * regroupe les blocs qui partagent des joueurs. Le camp de chaque groupe est décidé ensuite (orienterCompos).
 */
export function analyserCompos(html: string): [JoueurCompo[], JoueurCompo[]] | null {
  const blocsJ: JoueurCompo[][] = [];
  for (const x of html.matchAll(/<a\s+class="player-pitch[^"]*"\s+href="[^"]*\/joueur\/([^"/]+)"\s*>([\s\S]*?)<\/a>/g)) {
    const id = x[1], bloc = x[2];
    const numero = Number(bloc.match(/player-pitch__number">\s*(\d+)\s*</)?.[1] ?? NaN);
    if (!Number.isFinite(numero)) continue;
    const prenom = decode(bloc.match(/__first-name">([^<]*)</)?.[1] ?? "").trim();
    const nom = decode(bloc.match(/__last-name">([^<]*)</)?.[1] ?? "").trim();
    const j = { lnrId: id, numero, prenom: joli(prenom), nom: joli(nom), photo: null };
    const dernier = blocsJ.at(-1);
    // nouveau bloc quand la numérotation repart en arrière
    if (!dernier || numero < dernier[dernier.length - 1].numero) blocsJ.push([j]); else dernier.push(j);
  }
  // regroupe les blocs qui ont au moins un joueur en commun
  const groupes: { ids: Set<string>; joueurs: Map<string, JoueurCompo> }[] = [];
  for (const b of blocsJ) {
    const lies = groupes.filter((g) => b.some((j) => g.ids.has(j.lnrId)));
    const cible = lies[0] ?? (groupes.push({ ids: new Set(), joueurs: new Map() }), groupes[groupes.length - 1]);
    for (const autre of lies.slice(1)) { for (const [k, v] of autre.joueurs) cible.joueurs.set(k, v); autre.ids.forEach((i) => cible.ids.add(i)); groupes.splice(groupes.indexOf(autre), 1); }
    for (const j of b) { cible.ids.add(j.lnrId); if (!cible.joueurs.has(j.lnrId)) cible.joueurs.set(j.lnrId, j); }
  }
  if (groupes.length !== 2) return null;
  const [a, b] = groupes.map((g) => [...g.joueurs.values()].sort((x, y) => x.numero - y.numero));
  return a.length >= 15 && b.length >= 15 ? [a, b] : null;
}

/**
 * Décide quel groupe reçoit. Votes : club actuel de nos joueurs (effectifs LNR, le plus sûr), puis le camp
 * annoncé par la LNR pour les faits de jeu et remplacements. À égalité, l'ordre de la page.
 */
export function orienterCompos(groupes: [JoueurCompo[], JoueurCompo[]], club: Map<string, "home" | "away">, annonce: Map<string, "home" | "away"> = new Map()) {
  const score = (g: JoueurCompo[], side: "home" | "away") => g.reduce((n, j) => n + (club.get(j.lnrId) === side ? 3 : 0) + (annonce.get(j.lnrId) === side ? 1 : 0), 0);
  const droit = score(groupes[0], "home") + score(groupes[1], "away");
  const inverse = score(groupes[0], "away") + score(groupes[1], "home");
  return inverse > droit ? { dom: groupes[1], ext: groupes[0] } : { dom: groupes[0], ext: groupes[1] };
}

/** Club actuel (dans notre base) des joueurs LNR cités, pour orienter les compositions. */
async function clubsConnus(db: SupabaseClient, ids: string[], domId: string, extId: string) {
  const out = new Map<string, "home" | "away">();
  if (!ids.length) return out;
  const { data } = await db.from("players").select("lnr_id, team_id").in("lnr_id", ids);
  for (const p of data ?? []) if (p.team_id === domId) out.set(p.lnr_id as string, "home"); else if (p.team_id === extId) out.set(p.lnr_id as string, "away");
  return out;
}
