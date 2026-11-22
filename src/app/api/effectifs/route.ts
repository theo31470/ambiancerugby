import { shopDb } from "@/lib/shop/admin";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Effectifs officiels LNR (Top 14, Pro D2). Protégée par le secret de synchro. */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const u = new URL(req.url);
  const voir = u.searchParams.get("voir");
  if (voir) {
    const r = await fetch(voir, { cache: "no-store", headers: { "user-agent": "Mozilla/5.0 (compatible; AmbianceRugby/1.0; +https://ambiance-rugby.fr)", accept: "text/html" } });
    const html = await r.text();
    const i = html.indexOf("/joueur/");
    return Response.json({ status: r.status, taille: html.length, nbJoueur: html.split("/joueur/").length - 1, extrait: html.slice(Math.max(0, i - 2500), i + 2500) });
  }
  return Response.json({ ok: true });
}
