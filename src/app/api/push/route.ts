import webpush from "web-push";
import { shopDb } from "@/lib/shop/admin";

export const dynamic = "force-dynamic";

/**
 * Envoie une alerte (table notifications) en notification push sur tous les appareils du membre.
 * Appelée par la base à chaque nouvelle alerte ; protégée par le secret de synchro.
 */
export async function POST(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return new Response("accès refusé", { status: 401 });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ ok: false, raison: "clés VAPID absentes" });
  webpush.setVapidDetails(process.env.VAPID_SUJET ?? "mailto:contact@ambiance-rugby.fr", pub, priv);

  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  if (!id) return Response.json({ ok: false });
  const { data: n } = await db.from("notifications").select("id,user_id,kind,title,body,url").eq("id", id).maybeSingle();
  if (!n) return Response.json({ ok: false });
  const { data: abos } = await db.from("push_abonnements").select("id,endpoint,p256dh,auth").eq("user_id", n.user_id);
  const charge = JSON.stringify({
    title: n.title, body: n.body ?? "", url: n.url ?? "/",
    // une notification par match et par type : un nouvel essai remplace le précédent au lieu de s'empiler
    tag: n.url ? `${n.kind}-${n.url}` : undefined,
  });
  let envoyees = 0;
  await Promise.all((abos ?? []).map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, {
        TTL: ["try", "joueur", "retournement", "penalite"].includes(n.kind) ? 600 : 3600, urgency: ["try", "joueur", "retournement", "penalite"].includes(n.kind) ? "high" : "normal",
      });
      envoyees++;
      await db.from("push_abonnements").update({ dernier_envoi: new Date().toISOString() }).eq("id", a.id);
    } catch (e) {
      // abonnement expiré ou désinstallé : on l'oublie
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_abonnements").delete().eq("id", a.id);
    }
  }));
  return Response.json({ ok: true, envoyees });
}
