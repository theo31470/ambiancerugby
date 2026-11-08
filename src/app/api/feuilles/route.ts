import { revalidatePath } from "next/cache";
import { shopDb } from "@/lib/shop/admin";
import { importerFeuilleEspn, SELECT_MATCH_ESPN, type MatchLocal } from "@/lib/feuilles/espn";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Appelée toutes les 20 minutes par la base (pg_cron) : lit la feuille de match ESPN
 * des matchs terminés qui n'ont encore aucune stat joueur. Protégée par le secret de synchro.
 */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });

  const maintenant = Date.now();
  const { data: candidats } = await db.from("matches").select(`${SELECT_MATCH_ESPN}, feuille_tentee_at`)
    .eq("status", "finished")
    .gte("kickoff_at", new Date(maintenant - 1900 * 86400e3).toISOString())
    .lte("kickoff_at", new Date(maintenant - 2 * 3600e3).toISOString())
    .or(`feuille_tentee_at.is.null,feuille_tentee_at.lt.${new Date(maintenant - 6 * 3600e3).toISOString()}`)
    .order("kickoff_at", { ascending: false }).limit(300);
  const avecLigue = ((candidats ?? []) as unknown as (MatchLocal & { id: string })[]).filter((m) => m.competition?.espn_league);
  const { data: saisis } = avecLigue.length ? await db.from("player_match_stats").select("match_id").in("match_id", avecLigue.map((m) => m.id)) : { data: [] };
  const faits = new Set((saisis ?? []).map((x) => x.match_id));
  const aFaire = avecLigue.filter((m) => !faits.has(m.id)).slice(0, 25);

  const bilan: string[] = [];
  const debut = Date.now();
  for (const m of aFaire) {
    if (Date.now() - debut > 90_000) break;
    let resultat: string;
    try {
      const r = await importerFeuilleEspn(db, m);
      resultat = r.ok ? `espn ${r.dom}-${r.ext}${r.conforme ? "" : " (écart)"}` : r.raison;
    } catch (e) {
      resultat = `erreur : ${(e as Error).message}`.slice(0, 200);
    }
    await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: resultat }).eq("id", m.id);
    bilan.push(`${m.id} ${resultat}`);
  }
  if (bilan.some((b) => b.includes("espn "))) revalidatePath("/", "layout");
  return Response.json({ traites: bilan.length, bilan });
}
