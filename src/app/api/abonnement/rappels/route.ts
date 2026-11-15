import { shopDb } from "@/lib/shop/admin";
import { rappelRenouvellement } from "@/lib/email/envois";

export const dynamic = "force-dynamic";

/**
 * Chaque jour : prévient les abonnés annuels dont l'abonnement se renouvelle dans 35 à 40 jours
 * (la loi demande entre 1 et 3 mois avant). La fenêtre de 5 jours rattrape un jour manqué ; l'envoi est dédoublonné.
 */
export async function POST(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const de = new Date(Date.now() + 35 * 864e5).toISOString(), a = new Date(Date.now() + 40 * 864e5).toISOString();
  const { data } = await db.from("profiles").select("id,plan_until").eq("plan_formule", "annuel").eq("plan_statut", "active").eq("plan_fin_prevue", false).gte("plan_until", de).lt("plan_until", a);
  // déjà prévenus pour ce renouvellement (dans les 60 derniers jours)
  const { data: deja } = await db.from("email_log").select("user_id").eq("template", "renouvellement").eq("status", "sent").gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString());
  const prevenus = new Set((deja ?? []).map((x) => x.user_id));
  let envoyes = 0;
  for (const p of (data ?? []).filter((x) => !prevenus.has(x.id))) if (p.plan_until && (await rappelRenouvellement(p.id, p.plan_until, 5900).catch(() => false))) envoyes++;
  return Response.json({ ok: true, envoyes });
}
