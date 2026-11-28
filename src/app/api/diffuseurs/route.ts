import { revalidatePath } from "next/cache";
import { shopDb } from "@/lib/shop/admin";
import { synchroniserDiffuseurs } from "@/lib/diffuseurs";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Chaînes TV des matchs à venir (calendrier LNR). Appelée par la base plusieurs fois par jour, protégée par le secret de synchro. */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const r = await synchroniserDiffuseurs(db);
  if (r.maj) revalidatePath("/programme-tv");
  return Response.json(r);
}
