import { revalidatePath } from "next/cache";
import { shopDb } from "@/lib/shop/admin";
import { synchroniserEffectifsLnr } from "@/lib/effectifs-lnr";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Effectifs officiels LNR (Top 14, Pro D2) : la LNR fait foi pour le club actuel des joueurs.
 * Appelée chaque nuit par la base. Paramètres : ?comp=pro-d2|top-14 (les deux par défaut), ?club=<slug LNR>, ?essai=1 (sans écrire).
 * Protégée par le secret de synchro.
 */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const u = new URL(req.url);
  const comps = u.searchParams.get("comp") ? [u.searchParams.get("comp")!] : ["top-14", "pro-d2"];
  const essai = u.searchParams.get("essai") === "1";
  const club = u.searchParams.get("club") ?? undefined;
  const resultat: Record<string, unknown> = {};
  for (const c of comps) {
    try { resultat[c] = await synchroniserEffectifsLnr(db, c, { essai, club }); }
    catch (e) { resultat[c] = { erreur: (e as Error).message }; }
  }
  if (!essai) { revalidatePath("/clubs/[slug]", "page"); revalidatePath("/joueurs/[slug]", "page"); }
  return Response.json({ essai, resultat });
}
