import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Effectifs officiels de la LNR (top14.lnr.fr, prod2.lnr.fr, page « Effectif & staff » de chaque club).
 * La LNR fait foi pour le club actuel d'un joueur : on rattache chaque joueur listé à son club
 * et on sort de l'effectif ceux qui n'y figurent plus (sauf les fiches verrouillées à la main).
 */
const UA = "Mozilla/5.0 (compatible; AmbianceRugby/1.0; +https://ambiance-rugby.fr)";
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const joli = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const VIDES = new Set(["stade", "rugby", "club", "union", "section", "olympique", "racing", "pays", "sporting", "us", "usa", "ca", "su", "rc", "as", "asm", "fc", "cs", "de", "du", "la", "le", "et"]);

async function page(url: string) {
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { "user-agent": UA, accept: "text/html" } });
  if (!r.ok) throw new Error(`LNR : HTTP ${r.status}`);
  return r.text();
}

export type JoueurEffectif = { lnrId: string; prenom: string; nom: string; poste: string | null; pays: string | null; photo: string | null };

/** « 1ère ligne », « Demi d'ouverture »… -> nos postes (la 1re ligne ne dit pas pilier ou talonneur : on ne tranche pas). */
function poste(t: string): string | null {
  const s = norm(t);
  if (/2 ?e?me ligne|deuxieme/.test(s)) return "deuxieme-ligne";
  if (/3 ?e?me ligne|troisieme/.test(s)) return "troisieme-ligne";
  if (/pilier/.test(s)) return "pilier";
  if (/talonneur/.test(s)) return "talonneur";
  if (/melee/.test(s)) return "demi-de-melee";
  if (/ouverture/.test(s)) return "demi-d-ouverture";
  if (/centre/.test(s)) return "centre";
  if (/ailier/.test(s)) return "ailier";
  if (/arriere/.test(s)) return "arriere";
  return null;
}

/** « Yanis BOULASSEL » -> prénom « Yanis », nom « Boulassel » (le nom est en capitales). */
function couper(complet: string) {
  const mots = complet.split(/\s+/).filter(Boolean);
  const i = mots.findIndex((m) => m === m.toUpperCase() && /\p{Lu}{2,}/u.test(m));
  if (i <= 0) return { prenom: joli(mots[0] ?? ""), nom: joli(mots.slice(1).join(" ")) };
  return { prenom: joli(mots.slice(0, i).join(" ")), nom: joli(mots.slice(i).join(" ")) };
}

/** Lit la page « effectif-staff » d'un club : ses joueurs (le staff est ignoré) et le nom officiel du club. */
export function lireEffectifLnr(html: string): { club: string | null; joueurs: JoueurEffectif[] } {
  const joueurs: JoueurEffectif[] = [];
  const vus = new Set<string>();
  for (const x of html.matchAll(/<a\s+href="[^"]*\/joueur\/([^"/?#]+)"\s+class="player-block[^"]*"\s*>([\s\S]*?)<\/a>/g)) {
    const id = x[1], bloc = x[2];
    if (vus.has(id)) continue;
    const complet = decode(bloc.match(/player-block__name">([^<]*)</)?.[1] ?? "");
    if (!complet) continue;
    vus.add(id);
    const { prenom, nom } = couper(complet);
    const photo = bloc.match(/src="([^"]+)"[^>]*class="player-block__player-img/)?.[1] ?? null;
    joueurs.push({
      lnrId: id, prenom, nom,
      poste: poste(decode(bloc.match(/player-block__position">([^<]*)</)?.[1] ?? "")),
      pays: decode(bloc.match(/alt="([^"]*)"[^>]*class="player-block__country/)?.[1] ?? "") || null,
      photo: photo && !/placeholder|default/i.test(photo) ? photo : null,
    });
  }
  const club = decode(html.match(/alt="([^"]*)"[^>]*class="player-block__club/)?.[1] ?? "") || null;
  return { club, joueurs };
}

type Equipe = { id: string; name: string; short_name: string | null; aliases: string[] | null };

/** Notre club correspondant à un club LNR (nom officiel + adresse de sa page). */
function retrouver(equipes: Equipe[], nomLnr: string | null, slug: string): Equipe | null {
  const mots = (s: string) => norm(s).split(" ").filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !VIDES.has(w));
  const cible = new Set([...mots(nomLnr ?? ""), ...mots(slug.replace(/-/g, " "))]);
  let meilleur: Equipe | null = null, score = 0;
  for (const e of equipes) {
    const siens = new Set([e.name, e.short_name, ...(e.aliases ?? [])].flatMap((n) => mots(n ?? "")));
    const s = [...cible].filter((w) => siens.has(w)).length + (nomLnr && norm(nomLnr) === norm(e.name) ? 5 : 0);
    if (s > score) { score = s; meilleur = e; }
  }
  return score > 0 ? meilleur : null;
}

export type BilanClub = { club: string; lnr: string; joueurs: number; crees: number; rattaches: number; sortis: number; erreur?: string };

/** Synchronise les effectifs d'une compétition LNR. `essai` : on lit et on compte sans rien écrire. */
export async function synchroniserEffectifsLnr(db: SupabaseClient, compSlug: string, opts: { essai?: boolean; club?: string } = {}): Promise<BilanClub[]> {
  const { data: comp } = await db.from("competitions").select("id, current_season, lnr_site").eq("slug", compSlug).maybeSingle();
  if (!comp?.lnr_site) throw new Error(`compétition ${compSlug} sans site LNR`);
  const site = (comp.lnr_site as string).replace(/\/$/, "");
  const { data: liens } = await db.from("team_competitions").select("team:teams(id, name, short_name, aliases)").eq("competition_id", comp.id).eq("season", comp.current_season);
  const equipes = ((liens ?? []) as unknown as { team: Equipe }[]).map((l) => l.team).filter(Boolean);

  const accueil = await page(`${site}/clubs`);
  let slugs = [...new Set([...accueil.matchAll(/\/club\/([a-z0-9-]+)(?=["/])/g)].map((m) => m[1]))];
  if (opts.club) slugs = slugs.filter((s) => s === opts.club);

  const bilan: BilanClub[] = [];
  for (const slug of slugs) {
    try {
      const { club, joueurs } = lireEffectifLnr(await page(`${site}/club/${slug}/effectif-staff`));
      const equipe = retrouver(equipes, club, slug);
      if (!equipe) { bilan.push({ club: club ?? slug, lnr: slug, joueurs: joueurs.length, crees: 0, rattaches: 0, sortis: 0, erreur: "club introuvable chez nous" }); continue; }
      // page mal lue ou effectif pas encore publié : on ne touche à rien plutôt que de vider le club
      if (joueurs.length < 25) { bilan.push({ club: equipe.name, lnr: slug, joueurs: joueurs.length, crees: 0, rattaches: 0, sortis: 0, erreur: "effectif trop court, ignoré" }); continue; }
      bilan.push(await appliquer(db, equipe, joueurs, !!opts.essai, slug));
    } catch (e) {
      bilan.push({ club: slug, lnr: slug, joueurs: 0, crees: 0, rattaches: 0, sortis: 0, erreur: (e as Error).message });
    }
  }
  return bilan;
}

type Fiche = { id: string; first_name: string | null; last_name: string | null; name_key: string | null; team_id: string | null; lnr_id: string | null; in_squad: boolean | null; verrou: boolean | null; position: string | null; nationality: string | null; photo_source: string | null };
const CHAMPS = "id, first_name, last_name, name_key, team_id, lnr_id, in_squad, verrou, position, nationality, photo_source";

async function appliquer(db: SupabaseClient, equipe: Equipe, joueurs: JoueurEffectif[], essai: boolean, slug: string): Promise<BilanClub> {
  const ids = joueurs.map((j) => j.lnrId);
  const cles = joueurs.map((j) => norm(`${j.prenom} ${j.nom}`));
  const [{ data: parId }, { data: parCle }, { data: duClub }] = await Promise.all([
    db.from("players").select(CHAMPS).in("lnr_id", ids),
    db.from("players").select(CHAMPS).in("name_key", cles),
    db.from("players").select(CHAMPS).eq("team_id", equipe.id),
  ]);
  const gardes = new Set<string>();
  let crees = 0, rattaches = 0;
  for (const [i, j] of joueurs.entries()) {
    const cle = cles[i];
    let p: Fiche | undefined = (parId as Fiche[] | null)?.find((x) => x.lnr_id === j.lnrId)
      ?? (parCle as Fiche[] | null)?.find((x) => x.name_key === cle && (!x.lnr_id || x.lnr_id === j.lnrId));
    if (!p) {
      // même nom de famille dans le club, même initiale (fiche créée avant l'identifiant LNR)
      const memes = ((duClub ?? []) as Fiche[]).filter((x) => !x.lnr_id && norm(x.last_name) === norm(j.nom) && norm(x.first_name).slice(0, 1) === norm(j.prenom).slice(0, 1));
      if (memes.length === 1) p = memes[0];
    }
    if (!p) {
      // ailleurs dans la base (joueur arrivé d'un autre club), seulement si un seul joueur colle
      const { data: ailleurs } = await db.from("players").select(CHAMPS).ilike("last_name", j.nom).is("lnr_id", null).limit(5);
      const memes = ((ailleurs ?? []) as Fiche[]).filter((x) => norm(x.first_name).slice(0, 1) === norm(j.prenom).slice(0, 1));
      if (memes.length === 1) p = memes[0];
    }
    if (!p) {
      crees++;
      if (essai) continue;
      for (let n = 1; n < 6; n++) {
        const s = norm(`${j.prenom} ${j.nom}`).replace(/ /g, "-") + (n > 1 ? `-${n}` : "");
        const { data, error } = await db.from("players").insert({
          slug: s, first_name: j.prenom, last_name: j.nom, team_id: equipe.id, name_key: cle || null, source: "lnr", in_squad: true, lnr_id: j.lnrId,
          position: j.poste, nationality: j.pays, ...(j.photo ? { photo_url: j.photo, photo_source: "LNR" } : {}), synced_at: new Date().toISOString(),
        }).select("id").single();
        if (data) { gardes.add(data.id); break; }
        if (error?.code !== "23505" || error.message.includes("name_key")) break;
      }
      continue;
    }
    gardes.add(p.id);
    if (p.verrou) continue;
    const patch: Record<string, unknown> = {};
    if (p.team_id !== equipe.id) { patch.team_id = equipe.id; rattaches++; }
    if (!p.in_squad) patch.in_squad = true;
    if (!p.lnr_id) patch.lnr_id = j.lnrId;
    if (!p.position && j.poste) patch.position = j.poste;
    if (!p.nationality && j.pays) patch.nationality = j.pays;
    if (j.photo && (!p.photo_source || p.photo_source === "TheSportsDB")) { patch.photo_url = j.photo; patch.photo_source = "LNR"; }
    if (!essai && Object.keys(patch).length) await db.from("players").update({ ...patch, synced_at: new Date().toISOString() }).eq("id", p.id);
  }
  // ceux qui ne figurent plus dans l'effectif officiel du club : sortis de l'effectif (la fiche reste, avec son historique)
  const sortis = ((duClub ?? []) as Fiche[]).filter((x) => x.in_squad && !x.verrou && !gardes.has(x.id)).map((x) => x.id);
  if (!essai && sortis.length) for (let k = 0; k < sortis.length; k += 200) await db.from("players").update({ in_squad: false }).in("id", sortis.slice(k, k + 200));
  if (!essai) await db.from("teams").update({ squad_synced_at: new Date().toISOString(), squad_count: joueurs.length }).eq("id", equipe.id);
  return { club: equipe.name, lnr: slug, joueurs: joueurs.length, crees, rattaches, sortis: sortis.length };
}
