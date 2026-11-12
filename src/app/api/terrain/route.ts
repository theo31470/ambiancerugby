import { revalidatePath } from "next/cache";
import { shopDb } from "@/lib/shop/admin";
import { lireFilSportradar } from "@/lib/terrain";

export const dynamic = "force-dynamic";

/**
 * Récupère le fil positionné Sportradar d'un match pour la carte du terrain (une requête du quota).
 * POST { match_id, sr_id }, protégée par le secret de synchro (appelée depuis la base avec pg_net).
 */
export async function POST(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const { match_id, sr_id } = await req.json().catch(() => ({}));
  const { data: m } = await db.from("matches").select("id,home_score,away_score,status").eq("id", String(match_id ?? "")).maybeSingle();
  if (!m) return Response.json({ ok: false, message: "match introuvable" }, { status: 404 });
  try {
    const actions = await lireFilSportradar(String(sr_id ?? ""), { dom: m.home_score, ext: m.away_score });
    const placees = actions.filter((a) => a.x != null).length;
    if (placees < 30) return Response.json({ ok: false, message: `fil trop pauvre (${placees} actions placées)` }, { status: 422 });
    const { error } = await db.from("match_terrain").upsert({ match_id: m.id, source: "sportradar", source_id: String(sr_id), evenements: actions, recupere_le: new Date().toISOString() });
    if (error) throw error;
    revalidatePath("/matchs/[id]", "page");
    return Response.json({ ok: true, actions: actions.length, placees });
  } catch (e) {
    return Response.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
