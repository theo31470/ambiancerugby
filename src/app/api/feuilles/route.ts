import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { shopDb } from "@/lib/shop/admin";
import { importerFeuilleEspn, type MatchLocal } from "@/lib/feuilles/espn";
import { importerFeuilleLnr, SELECT_MATCH_FEUILLE } from "@/lib/feuilles/lnr";
import { importerFeuilleWr, SELECT_MATCH_WR, type MatchWr } from "@/lib/feuilles/worldrugby";
import portraits from "../../../../public/portraits/index.json";

// portraits détourés (GitHub Actions) : recopiés dans les fiches une fois par instance
let portraitsSynchro = false;
let classementsVerifies = 0;

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Appelée toutes les 2 minutes par la base (pg_cron) : lit les feuilles de match (LNR pour le Top 14 et la Pro D2, ESPN sinon)
 * des matchs en direct et des matchs terminés qui n'ont pas encore leurs stats. Protégée par le secret de synchro.
 */
async function corrigerClassements() {
  const db = shopDb();
  const { data: comps } = await db.from("competitions").select("id, current_season, standings_source, poules").eq("active", true);
  for (const c of comps ?? []) {
    const poules = c.poules as Record<string, string[]> | null;
    if (poules) {
      for (const [nom, ids] of Object.entries(poules)) {
        await db.from("standings").update({ pool: nom }).eq("competition_id", c.id).eq("season", c.current_season).in("team_id", ids).neq("pool", nom);
      }
    }
    // recalcule les bonus offensifs et les rangs dans chaque poule
    if (c.standings_source === "calcul" || poules) await db.rpc("appliquer_bonus_offensif", { p_comp: c.id });
  }
}

export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });

  // la base choisit : matchs en direct d'abord, puis terminés sans stats (jamais tentés en premier)
  const { data: ids, error } = await db.rpc("feuilles_a_traiter", { p_limite: 10 });
  if (error) return Response.json({ erreur: error.message }, { status: 500 });
  const liste = ((ids ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { feuilles_a_traiter: string }).feuilles_a_traiter));
  const { data: matchs } = liste.length ? await db.from("matches").select(`${SELECT_MATCH_FEUILLE}, feuille_resultat`).in("id", liste) : { data: [] };
  type M = MatchLocal & { id: string; status: string; round: string | null; season: string | null; lnr_url: string | null; competition: { espn_league: string | null; lnr_site: string | null; wr_ok: boolean } };
  const aFaire = ((matchs ?? []) as unknown as M[])
    .map((m) => ({ ...m, live: m.status === "live" || m.status === "halftime" }))
    .sort((a, b) => Number(b.live) - Number(a.live));

  /** Top 14 et Pro D2 : feuille officielle de la LNR d'abord ; ESPN en secours, et pour les autres compétitions. */
  async function lire(m: (typeof aFaire)[number]): Promise<string> {
    let lnr = "";
    if (m.competition?.lnr_site) {
      const r = await importerFeuilleLnr(db, m).catch((e: Error) => ({ ok: false as const, raison: `erreur LNR : ${e.message}` }));
      if (r.ok) return `${r.enCours ? "direct" : "lnr"} ${r.dom}-${r.ext}${r.conforme || r.enCours ? "" : " (écart)"}`;
      lnr = r.raison;
      if (!m.competition.espn_league || m.status === "scheduled") return lnr;
    }
    // World Rugby d'abord (stats complètes), ESPN en secours
    let wr = "";
    if (m.competition?.wr_ok && !m.competition.lnr_site) {
      const r = await importerFeuilleWr(db, m as unknown as MatchWr).catch((e: Error) => ({ ok: false as const, raison: `erreur World Rugby : ${e.message}`.slice(0, 160) }));
      if (r.ok) return `${r.live ? "direct" : "wr"} ${r.dom}-${r.ext}${r.conforme || r.live ? "" : " (écart)"}`;
      wr = r.raison;
    }
    if (!m.competition?.espn_league) return [lnr, wr].filter(Boolean).join(" ; ") || "compétition non couverte";
    const r = await importerFeuilleEspn(db, m);
    if (r.ok) return `${m.live ? "direct" : "espn"} ${r.dom}-${r.ext}${r.conforme || m.live ? "" : " (écart)"}`;
    return [lnr, wr, r.raison].filter(Boolean).join(" ; ");
  }

  // on répond tout de suite (la file d'appels de la base n'attend pas), le travail continue ensuite
  after(async () => {
    if (!portraitsSynchro) {
      portraitsSynchro = true;
      await db.rpc("maj_portraits", { p: portraits }).then(({ data }) => { if (Number(data) > 0) revalidatePath("/joueurs", "layout"); }, () => { portraitsSynchro = false; });
    }
    const bilan: string[] = [];
    const debut = Date.now();
    // on ne vide le cache du site que si un match récent a changé (le rattrapage de vieux matchs ne doit pas tout régénérer)
    let recent = false;
    const marquer = (kickoff: string, ok: boolean) => { if (ok && Date.now() - new Date(kickoff).getTime() < 4 * 86400e3) recent = true; };
    // deux files en parallèle : les feuilles à lire (direct d'abord), et le rattrapage des stats World Rugby
    const feuilles = async () => {
      for (const m of aFaire) {
        if (Date.now() - debut > 100_000) break;
        let resultat: string;
        try { resultat = await lire(m); } catch (e) { resultat = `erreur : ${(e as Error).message}`.slice(0, 200); }
        await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: resultat }).eq("id", m.id);
        marquer(m.kickoff_at, /^(espn|lnr|direct|wr) /.test(resultat));
        bilan.push(resultat);
      }
    };
    // rattrapage : feuilles ESPN remplacées par World Rugby ; feuilles LNR complétées (courses, mètres, défenseurs battus…)
    const rattrapage = async () => {
      const { data: wr } = await db.rpc("stats_wr_a_traiter", { p_limite: 6 });
      const idsWr = ((wr ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { stats_wr_a_traiter: string }).stats_wr_a_traiter));
      if (!idsWr.length) return;
      const { data: ms } = await db.from("matches").select(`${SELECT_MATCH_WR}, competition:competitions(lnr_site)`).in("id", idsWr);
      for (const m of (ms ?? []) as unknown as (MatchWr & { competition: { lnr_site: string | null } | null })[]) {
        if (Date.now() - debut > 100_000) break;
        // rattrapage au ralenti : la base (offre gratuite) a un budget d'écriture limité
        await new Promise((ok) => setTimeout(ok, 4000));
        const r = await importerFeuilleWr(db, m, { completer: !!m.competition?.lnr_site }).catch((e: Error) => ({ ok: false as const, raison: `erreur : ${e.message}`.slice(0, 200) }));
        const res = r.ok ? `wr ${r.joueurs} joueurs${r.detail ? "" : " (sans détail)"}` : r.raison;
        // introuvable chez World Rugby : on n'y revient pas avant longtemps ; sinon nouvel essai dans 3 heures
        const vieux = Date.now() - new Date(m.kickoff_at).getTime() > 3 * 86400e3;
        const quand = r.ok || r.raison.includes("réseau") ? new Date() : r.raison.startsWith("match introuvable") ? new Date(Date.now() + 365 * 86400e3) : vieux ? new Date(Date.now() + 30 * 86400e3) : new Date();
        await db.from("matches").update({ stats_wr_at: quand.toISOString(), stats_wr_resultat: res }).eq("id", m.id);
        marquer(m.kickoff_at, r.ok);
        bilan.push(res);
      }
    };
    await Promise.all([feuilles(), rattrapage()]);
    // toutes les 20 minutes : poules fixées (Nations Championship…) et bonus offensifs, que la synchro de nuit réécrit sans eux
    if (Date.now() - classementsVerifies > 20 * 60e3) {
      classementsVerifies = Date.now();
      await corrigerClassements().catch(() => { classementsVerifies = 0; });
    }
    if (recent) revalidatePath("/", "layout");
  });
  return Response.json({ lances: aFaire.length });
}
