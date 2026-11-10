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

  // la base choisit : matchs en direct d'abord, puis terminés sans stats (jamais tentés en premier)
  const { data: ids, error } = await db.rpc("feuilles_a_traiter", { p_limite: 25 });
  if (error) return Response.json({ erreur: error.message }, { status: 500 });
  const liste = ((ids ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { feuilles_a_traiter: string }).feuilles_a_traiter));
  const { data: matchs } = liste.length ? await db.from("matches").select(`${SELECT_MATCH_ESPN}, feuille_resultat`).in("id", liste) : { data: [] };
  const aFaire = ((matchs ?? []) as unknown as (MatchLocal & { id: string; status: string })[])
    .map((m) => ({ ...m, live: m.status === "live" || m.status === "halftime" }))
    .sort((a, b) => Number(b.live) - Number(a.live));

  const bilan: string[] = [];
  const debut = Date.now();
  for (const m of aFaire) {
    if (Date.now() - debut > 90_000) break;
    let resultat: string;
    try {
      const r = await importerFeuilleEspn(db, m);
      resultat = r.ok ? `${m.live ? "direct" : "espn"} ${r.dom}-${r.ext}${r.conforme || m.live ? "" : " (écart)"}` : r.raison;
    } catch (e) {
      resultat = `erreur : ${(e as Error).message}`.slice(0, 200);
    }
    await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: resultat }).eq("id", m.id);
    bilan.push(`${m.id} ${resultat}`);
  }
  if (bilan.some((b) => / (espn|direct) /.test(b))) revalidatePath("/", "layout");
  return Response.json({ traites: bilan.length, bilan });
}
