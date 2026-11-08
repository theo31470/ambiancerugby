// Ambiance Rugby — effectifs automatiques.
//   squads  lit les effectifs des clubs sur Wikipédia (licence CC BY-SA) et crée / met à jour les joueurs
//   enrich  complète chaque joueur via TheSportsDB (clé gratuite) : photo, date de naissance, taille, poids
// Les joueurs « verrouillés » (corrigés à la main) ne sont jamais modifiés.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const UA = "AmbianceRugby/1.0 (https://ambiancerugby.vercel.app; effectifs)";
const WIKI = "https://en.wikipedia.org/w/api.php";
const TSDB = "https://www.thesportsdb.com/api/v1/json/123";
const BUDGET_MS = 110_000;
const CLUBS_PAR_PASSE = 6; // limite CPU des fonctions (offre gratuite)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => norm(s).replace(/ /g, "-");

const PAYS: Record<string, string> = {
  FRA: "France", ENG: "Angleterre", IRL: "Irlande", SCO: "Écosse", WAL: "Pays de Galles", ITA: "Italie", RSA: "Afrique du Sud",
  NZL: "Nouvelle-Zélande", AUS: "Australie", ARG: "Argentine", FIJ: "Fidji", SAM: "Samoa", TGA: "Tonga", TON: "Tonga", GEO: "Géorgie",
  ROU: "Roumanie", ESP: "Espagne", POR: "Portugal", USA: "États-Unis", CAN: "Canada", JPN: "Japon", URU: "Uruguay", CHI: "Chili",
  NAM: "Namibie", ZIM: "Zimbabwe", BEL: "Belgique", NED: "Pays-Bas", GER: "Allemagne", RUS: "Russie", HKG: "Hong Kong", KEN: "Kenya",
  BRA: "Brésil", SUI: "Suisse", POL: "Pologne", SWE: "Suède", CZE: "Tchéquie", UKR: "Ukraine", MAR: "Maroc", TUN: "Tunisie",
  CIV: "Côte d'Ivoire", SEN: "Sénégal", CMR: "Cameroun", PNG: "Papouasie-Nouvelle-Guinée", COK: "Îles Cook", KOR: "Corée du Sud",
  GBR: "Royaume-Uni", NIR: "Irlande du Nord", MDA: "Moldavie", LTU: "Lituanie", CRO: "Croatie", MLT: "Malte", PAR: "Paraguay",
  COL: "Colombie", MEX: "Mexique", UGA: "Ouganda", ZAM: "Zambie", NGR: "Nigeria", GHA: "Ghana", MAD: "Madagascar", CPV: "Cap-Vert",
};

/** Intitulé de rubrique Wikipédia -> poste (valeurs autorisées par la base). */
function poste(titre: string): string | null {
  const t = titre.toLowerCase();
  if (/prop/.test(t)) return "pilier";
  if (/hooker/.test(t)) return "talonneur";
  if (/lock|second.row/.test(t)) return "deuxieme-ligne";
  if (/back.row|flanker|number.?8|no\.?\s?8|loose.forward|loosies/.test(t)) return "troisieme-ligne";
  if (/scrum|half.?back/.test(t)) return "demi-de-melee";
  if (/fly|first.five|out.?half|stand.off/.test(t)) return "demi-d-ouverture";
  if (/centre|center|midfield|second.five/.test(t)) return "centre";
  if (/wing/.test(t)) return "ailier";
  if (/full.?back/.test(t)) return "arriere";
  return null;
}

type Joueur = { nom: string; prenom: string; complet: string; pays: string | null; poste: string | null };

/** Lit le premier effectif « {{RU squad player|NAT|Nom}} » d'une page Wikipédia anglaise. */
function lireEffectif(wikitext: string): Joueur[] {
  let txt = wikitext;
  const debut = txt.search(/\{\{\s*(template:\s*)?rugby union squad start/i);
  if (debut >= 0) {
    txt = txt.slice(debut);
    // fin du premier effectif : modèle de fin, effectif suivant (Espoirs, féminines…) ou nouvelle section
    const suite = txt.slice(20);
    const fins = [/\{\{\s*(template:\s*)?rugby union squad end/i, /\{\{\s*(template:\s*)?rugby union squad start/i, /\n==[^=]/, /\{\{\s*end\s*\}\}/i, /'''[^'\n]*(academy|espoirs|development|under-?2[03]|u2[03]|women)[^'\n]*'''/i]
      .map((re) => suite.search(re)).filter((i) => i >= 0);
    if (fins.length) txt = txt.slice(0, 20 + Math.min(...fins));
  } else {
    const i = txt.search(/\{\{\s*(RU|rugby union) squad player/i);
    if (i < 0) return [];
    txt = txt.slice(Math.max(0, i - 400), i + 20000);
  }
  const out: Joueur[] = [];
  let rubrique: string | null = null;
  for (const brut of txt.split("\n")) {
    const ligne = brut.trim();
    const titre = ligne.match(/^'''(.+?)'''/) ?? ligne.match(/^;\s*(.+)$/) ?? ligne.match(/^=+\s*(.+?)\s*=+$/);
    if (titre) { rubrique = poste(titre[1]); continue; }
    const m = ligne.match(/\{\{\s*(?:RU|rugby union) squad player\s*\|(.*)\}\}/i);
    if (!m) continue;
    // [[cible|texte]] -> texte, [[cible]] -> cible
    const propre = m[1].replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2").replace(/\[\[([^\]]*)\]\]/g, "$1").replace(/<[^>]+>/g, "");
    const parts = propre.split("|").map((p) => p.trim());
    const positionnels = parts.filter((p) => !/^[a-z_]+\s*=/i.test(p));
    const nommes = Object.fromEntries(parts.filter((p) => /^[a-z_]+\s*=/i.test(p)).map((p) => [p.split("=")[0].trim().toLowerCase(), p.split("=").slice(1).join("=").trim()]));
    const code = (nommes.nat ?? positionnels[0] ?? "").toUpperCase();
    const complet = (nommes.name ?? positionnels[1] ?? "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
    if (!complet || complet.length < 3) continue;
    const mots = complet.split(" ");
    out.push({ complet, prenom: mots.length > 1 ? mots[0] : "", nom: mots.length > 1 ? mots.slice(1).join(" ") : mots[0], pays: PAYS[code] ?? (code || null), poste: poste(nommes.pos ?? "") ?? rubrique });
  }
  // une même personne listée deux fois (ex. joueur Espoir) : on garde la première
  const vus = new Set<string>();
  return out.filter((j) => (vus.has(norm(j.complet)) ? false : (vus.add(norm(j.complet)), true)));
}

async function wikiGet(params: Record<string, string>) {
  const u = new URL(WIKI);
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`Wikipédia HTTP ${r.status}`);
  return r.json();
}

/** Contenu de plusieurs pages en une requête (suit les redirections). */
async function contenus(titres: string[]) {
  const d = await wikiGet({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", redirects: "1", titles: titres.join("|") });
  const map = new Map<string, { titre: string; texte: string }>();
  const redir = new Map<string, string>();
  for (const r of d.query?.redirects ?? []) redir.set(r.from, r.to);
  for (const r of d.query?.normalized ?? []) redir.set(r.from, redir.get(r.to) ?? r.to);
  for (const p of d.query?.pages ?? []) {
    const texte = p.revisions?.[0]?.slots?.main?.content;
    if (texte) map.set(p.title, { titre: p.title, texte });
  }
  return (t: string) => map.get(redir.get(t) ?? t) ?? map.get(t);
}

const estClub = (texte: string) => /squad player/i.test(texte) && !/\{\{\s*infobox national rugby union team/i.test(texte);

/** Parmi des titres, ceux dont la page utilise le modèle d'effectif (requête légère, sans le contenu). */
async function avecEffectif(titres: string[]) {
  const d = await wikiGet({ action: "query", prop: "templates", tltemplates: "Template:RU squad player|Template:Rugby union squad player", tllimit: "max", redirects: "1", titles: titres.join("|") });
  const redir = new Map<string, string>();
  for (const r of d.query?.normalized ?? []) redir.set(r.from, r.to);
  for (const r of d.query?.redirects ?? []) redir.set(r.from, r.to);
  for (const [k, v] of redir) if (redir.has(v)) redir.set(k, redir.get(v)!);
  const ok = new Set((d.query?.pages ?? []).filter((p: { templates?: unknown[] }) => p.templates?.length).map((p: { title: string }) => p.title));
  return titres.map((t) => redir.get(t) ?? t).filter((t, i, arr) => ok.has(t) && arr.indexOf(t) === i);
}

/** Trouve la page Wikipédia d'un club : nom exact, variantes, puis recherche. */
async function trouverPage(team: { name: string; short_name: string | null; aliases: string[] | null }) {
  const noms = [...new Set([team.name, team.short_name, ...(team.aliases ?? [])].filter(Boolean) as string[])];
  const candidats = [...new Set(noms.flatMap((n) => [n, `${n} (rugby union)`, `${n} Rugby`]))].slice(0, 30);
  let titres = await avecEffectif(candidats);
  if (!titres.length) {
    const s = await wikiGet({ action: "query", list: "search", srsearch: `${team.name} rugby union club squad`, srlimit: "5" });
    const trouves = (s.query?.search ?? []).map((x: { title: string }) => x.title);
    titres = trouves.length ? await avecEffectif(trouves) : [];
  }
  for (const t of titres.slice(0, 2)) {
    const p = (await contenus([t]))(t);
    if (p && estClub(p.texte)) return p;
  }
  return null;
}

// ---------- squads ----------
async function jobSquads(db: SupabaseClient, params: { slugs?: string[]; force?: boolean }, t0: number) {
  // clubs des compétitions actives (saison en cours), les plus relevées d'abord
  const { data: comps, error: e1 } = await db.from("competitions").select("id, current_season, niveau").eq("active", true).neq("kind", "international");
  if (e1) throw new Error(e1.message);
  const { data: liens, error: e2 } = await db.from("team_competitions").select("team_id, competition_id, season").in("competition_id", (comps ?? []).map((c) => c.id));
  if (e2) throw new Error(e2.message);
  const prio = new Map<string, number>();
  for (const l of liens ?? []) {
    const c = (comps ?? []).find((x) => x.id === l.competition_id);
    if (c && l.season === c.current_season) prio.set(l.team_id, Math.max(prio.get(l.team_id) ?? 0, c.niveau));
  }
  let q = db.from("teams").select("id, slug, name, short_name, aliases, wiki_title, squad_synced_at, is_national").eq("is_national", false);
  if (params.slugs?.length) q = q.in("slug", params.slugs);
  const { data: equipes } = await q;
  const semaine = Date.now() - 6 * 86400e3;
  const cibles = ((equipes ?? []) as any[])
    .filter((t) => params.slugs?.length || prio.has(t.id))
    .filter((t) => (params.force && params.slugs?.length) || !t.squad_synced_at || new Date(t.squad_synced_at).getTime() < semaine)
    .sort((a, b) => (prio.get(b.id) ?? 0) - (prio.get(a.id) ?? 0) || (a.squad_synced_at ?? "").localeCompare(b.squad_synced_at ?? ""));

  // tous les joueurs, par pages de 1 000 (limite de l'API Supabase)
  const existants: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data: page, error } = await db.from("players").select("id, slug, name_key, team_id, verrou, source").order("id").range(de, de + 999);
    if (error) throw new Error(error.message);
    existants.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }
  const slugs = new Set(existants.map((p) => p.slug));
  const parCle = new Map(existants.filter((p) => p.name_key).map((p) => [p.name_key, p]));
  const lignes: string[] = [];
  let crees = 0, maj = 0, sansPage = 0, clubs = 0;

  for (const t of cibles.slice(0, CLUBS_PAR_PASSE)) {
    if (Date.now() - t0 > BUDGET_MS) { lignes.push("temps écoulé, la suite au prochain passage"); break; }
    try {
      let page: { titre: string; texte: string } | null | undefined = null;
      if (t.wiki_title) page = (await contenus([t.wiki_title]))(t.wiki_title);
      if (!page && !t.wiki_title) page = await trouverPage(t);
      await sleep(300);
      const joueurs = page ? lireEffectif(page.texte) : [];
      if (!page || joueurs.length < 12) {
        sansPage++;
        await db.from("teams").update({ wiki_checked_at: new Date().toISOString(), squad_synced_at: new Date().toISOString(), squad_count: joueurs.length || null }).eq("id", t.id);
        lignes.push(`${t.name} : effectif introuvable`);
        continue;
      }
      clubs++;
      const vus = new Set<string>();
      for (const j of joueurs) {
        const cle = norm(j.complet);
        vus.add(cle);
        const ex = parCle.get(cle);
        if (ex) {
          if (ex.verrou) continue;
          const patch: Record<string, unknown> = { in_squad: true, synced_at: new Date().toISOString() };
          if (ex.team_id !== t.id) patch.team_id = t.id; // transfert
          if (j.poste) patch.position = j.poste;
          if (j.pays) patch.nationality = j.pays;
          await db.from("players").update(patch).eq("id", ex.id);
          ex.team_id = t.id;
          maj++;
        } else {
          let slug = slugify(j.complet) || `joueur-${crypto.randomUUID().slice(0, 6)}`;
          if (slugs.has(slug)) slug = `${slug}-${t.slug}`;
          let n = 2;
          while (slugs.has(slug)) slug = `${slugify(j.complet)}-${n++}`;
          const { data, error } = await db.from("players").insert({
            slug, first_name: j.prenom, last_name: j.nom, team_id: t.id, position: j.poste, nationality: j.pays,
            name_key: cle, source: "wikipedia", in_squad: true, synced_at: new Date().toISOString(),
          }).select("id, slug, name_key, team_id, verrou, source").single();
          if (error) { lignes.push(`${j.complet} : ${error.message}`); continue; }
          slugs.add(slug);
          parCle.set(cle, data);
          existants.push(data);
          crees++;
        }
      }
      // joueurs partis du club (seulement ceux venus de Wikipédia et non verrouillés)
      const partis = existants.filter((p) => p.team_id === t.id && p.source === "wikipedia" && !p.verrou && p.name_key && !vus.has(p.name_key)).map((p) => p.id);
      if (partis.length) await db.from("players").update({ in_squad: false }).in("id", partis);
      await db.from("teams").update({ wiki_title: page.titre, wiki_checked_at: new Date().toISOString(), squad_synced_at: new Date().toISOString(), squad_count: joueurs.length }).eq("id", t.id);
    } catch (e) {
      lignes.push(`${t.name} : ERREUR ${(e as Error).message}`);
    }
  }
  const reste = Math.max(0, cibles.length - clubs - sansPage);
  lignes.unshift(`${clubs} effectifs lus, ${crees} joueurs créés, ${maj} mis à jour, ${sansPage} clubs sans effectif Wikipédia${reste ? `, ${reste} clubs restants` : ""}`);
  return lignes;
}

// ---------- enrich ----------
function taille(s: string | null) {
  if (!s) return null;
  const m = s.match(/(\d)[.,](\d{2})\s*m/) ?? s.match(/(\d{3})\s*cm/);
  if (!m) return null;
  const v = m[2] ? Number(m[1]) * 100 + Number(m[2]) : Number(m[1]);
  return v >= 150 && v <= 220 ? v : null;
}
function poids(s: string | null) {
  const m = s?.match(/(\d{2,3})\s*kg/i);
  const v = m ? Number(m[1]) : null;
  return v && v >= 60 && v <= 160 ? v : null;
}

async function jobEnrich(db: SupabaseClient, t0: number) {
  const { data } = await db.from("players")
    .select("id, first_name, last_name, birth_date, height_cm, weight_kg, photo_url, photo_source, verrou, team:teams(name, short_name, aliases)")
    .is("tsdb_checked_at", null).eq("in_squad", true).limit(60);
  let trouves = 0, vus = 0;
  const un = async (p: any) => {
    const nom = `${p.first_name} ${p.last_name}`.trim();
    const patch: Record<string, unknown> = { tsdb_checked_at: new Date().toISOString() };
    try {
      const r = await fetch(`${TSDB}/searchplayers.php?p=${encodeURIComponent(nom)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 429) return "limite";
      const d = await r.json().catch(() => ({}));
      const rugby = ((d.player ?? []) as any[]).filter((x) => x.strSport === "Rugby" && norm(x.strPlayer) === norm(nom));
      const noms = [p.team?.name, p.team?.short_name, ...(p.team?.aliases ?? [])].map(norm);
      const x = rugby.find((c) => noms.includes(norm(c.strTeam))) ?? (rugby.length === 1 ? rugby[0] : null);
      if (x && !p.verrou) {
        trouves++;
        patch.tsdb_id = x.idPlayer;
        const photo = x.strCutout || x.strThumb || x.strRender;
        if (photo && (!p.photo_url || p.photo_source === "TheSportsDB")) { patch.photo_url = photo; patch.photo_source = "TheSportsDB"; }
        if (!p.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(x.dateBorn ?? "")) patch.birth_date = x.dateBorn;
        if (!p.height_cm) patch.height_cm = taille(x.strHeight);
        if (!p.weight_kg) patch.weight_kg = poids(x.strWeight);
        for (const k of ["height_cm", "weight_kg"]) if (patch[k] == null) delete patch[k];
      }
    } catch { return "erreur"; /* on réessaiera plus tard */ }
    await db.from("players").update(patch).eq("id", p.id);
    return "ok";
  };
  // 3 recherches en parallèle toutes les 6 s = 30 / minute, la limite de la clé gratuite
  const liste = (data ?? []) as any[];
  for (let i = 0; i < liste.length; i += 3) {
    if (Date.now() - t0 > BUDGET_MS - 25_000) break;
    const debut = Date.now();
    const res = await Promise.all(liste.slice(i, i + 3).map(un));
    vus += res.length;
    if (res.includes("limite")) { await sleep(30_000); break; }
    await sleep(Math.max(0, 6200 - (Date.now() - debut)));
  }
  const { count } = await db.from("players").select("id", { count: "exact", head: true }).is("tsdb_checked_at", null).eq("in_squad", true);
  return [`${vus} joueurs consultés, ${trouves} complétés (photo, naissance…), ${count ?? 0} restants`];
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: ok } = await db.rpc("check_sync_secret", { s: req.headers.get("x-sync-secret") ?? "" });
  if (!ok) return json({ error: "unauthorized" }, 401);
  const t0 = Date.now();
  const { job = "squads", params = {} } = await req.json().catch(() => ({}));
  let lignes: string[] = [];
  let okRun = true;
  try {
    if (job === "squads") lignes = await jobSquads(db, params, t0);
    else if (job === "enrich") lignes = await jobEnrich(db, t0);
    else throw new Error(`tâche inconnue : ${job}`);
  } catch (e) {
    okRun = false;
    lignes.push(`ERREUR ${(e as Error).message}`);
  }
  const silencieux = job === "enrich" && lignes[0]?.startsWith("0 joueurs");
  if (!silencieux) {
    await db.from("sync_runs").insert({ provider: job === "squads" ? "wikipedia" : "thesportsdb", job: `effectifs-${job}`, calls: 0, ok: okRun, message: lignes.join(" | ").slice(0, 4000), duration_ms: Date.now() - t0 });
  }
  return json({ ok: okRun, log: lignes, ms: Date.now() - t0 }, okRun ? 200 : 500);
});
