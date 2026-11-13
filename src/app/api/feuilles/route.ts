import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { shopDb } from "@/lib/shop/admin";
import { importerFeuilleEspn, type MatchLocal } from "@/lib/feuilles/espn";
import { importerFeuilleLnr, SELECT_MATCH_FEUILLE } from "@/lib/feuilles/lnr";
import { importerStatsWorldRugby, type MatchWr } from "@/lib/feuilles/worldrugby";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Appelée toutes les 2 minutes par la base (pg_cron) : lit les feuilles de match (LNR pour le Top 14 et la Pro D2, ESPN sinon)
 * des matchs en direct et des matchs terminés qui n'ont pas encore leurs stats. Protégée par le secret de synchro.
 */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });

  // la base choisit : matchs en direct d'abord, puis terminés sans stats (jamais tentés en premier)
  const { data: ids, error } = await db.rpc("feuilles_a_traiter", { p_limite: 25 });
  if (error) return Response.json({ erreur: error.message }, { status: 500 });
  const liste = ((ids ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { feuilles_a_traiter: string }).feuilles_a_traiter));
  const { data: matchs } = liste.length ? await db.from("matches").select(`${SELECT_MATCH_FEUILLE}, feuille_resultat`).in("id", liste) : { data: [] };
  type M = MatchLocal & { id: string; status: string; round: string | null; season: string | null; lnr_url: string | null; competition: { espn_league: string | null; lnr_site: string | null } };
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
    const r = await importerFeuilleEspn(db, m);
    if (r.ok) return `${m.live ? "direct" : "espn"} ${r.dom}-${r.ext}${r.conforme || m.live ? "" : " (écart)"}`;
    return `${lnr ? `${lnr} ; ` : ""}${r.raison}`;
  }

  // on répond tout de suite (la file d'appels de la base n'attend pas), le travail continue ensuite
  after(async () => {
    const bilan: string[] = [];
    const debut = Date.now();
    for (const m of aFaire) {
      if (Date.now() - debut > 100_000) break;
      let resultat: string;
      try { resultat = await lire(m); } catch (e) { resultat = `erreur : ${(e as Error).message}`.slice(0, 200); }
      await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: resultat }).eq("id", m.id);
      bilan.push(resultat);
    }
    // stats détaillées World Rugby pour les matchs hors LNR déjà terminés (tests internationaux surtout)
    const { data: wr } = await db.rpc("stats_wr_a_traiter", { p_limite: 5 });
    const idsWr = ((wr ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { stats_wr_a_traiter: string }).stats_wr_a_traiter));
    if (idsWr.length) {
      const { data: ms } = await db.from("matches")
        .select("id, kickoff_at, home_team_id, away_team_id, home_score, away_score, home:teams!matches_home_team_id_fkey(name,short_name,abbreviation,aliases), away:teams!matches_away_team_id_fkey(name,short_name,abbreviation,aliases)")
        .in("id", idsWr);
      for (const m of (ms ?? []) as unknown as MatchWr[]) {
        if (Date.now() - debut > 110_000) break;
        const r = await importerStatsWorldRugby(db, m).catch((e: Error) => ({ ok: false as const, raison: `erreur : ${e.message}`.slice(0, 200) }));
        const res = r.ok ? `wr ${r.joueurs} joueurs${r.hommeDuMatch ? ", homme du match" : ""}` : r.raison;
        // introuvable chez World Rugby : on n'y revient pas ; stats pas encore publiées : nouvel essai dans 3 heures
        const quand = !r.ok && r.raison.startsWith("match introuvable") ? new Date(Date.now() + 365 * 86400e3) : new Date();
        await db.from("matches").update({ stats_wr_at: quand.toISOString(), stats_wr_resultat: res }).eq("id", m.id);
        bilan.push(res);
      }
    }
    if (bilan.some((b) => /^(espn|lnr|direct|wr) /.test(b))) revalidatePath("/", "layout");
  });
  return Response.json({ lances: aFaire.length });
}
