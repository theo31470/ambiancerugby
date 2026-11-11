import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Mes données (RGPD) : tout ce que le site garde sur le membre connecté, en un fichier JSON. */
export async function GET() {
  const db = await createClient();
  const { data: c } = await db.auth.getClaims();
  const uid = c?.claims?.sub;
  if (!uid) return new Response("Connectez-vous.", { status: 401 });
  const [profil, commentaires, clubs, joueurs, alertes, commandes, factures] = await Promise.all([
    db.from("profiles").select("username, display_name, avatar_url, bio, ville, je_suis, favorite_team_id, profil_public, prefs, plan, plan_until, plan_formule, created_at").eq("id", uid).single(),
    db.from("comments").select("body, created_at, article_id, match_id").eq("user_id", uid),
    db.from("favorite_teams").select("team_id, created_at").eq("user_id", uid),
    db.from("favorite_players").select("player_id, created_at").eq("user_id", uid),
    db.from("notifications").select("*").eq("user_id", uid).limit(500),
    db.from("shop_orders").select("numero, statut, items, total_cents, created_at, facture_numero"),
    db.from("supporter_factures").select("numero, formule, montant_cents, payee_le").eq("user_id", uid),
  ]);
  const corps = {
    exporte_le: new Date().toISOString(), email: c?.claims?.email ?? null, profil: profil.data,
    commentaires: commentaires.data ?? [], clubs_suivis: clubs.data ?? [], joueurs_suivis: joueurs.data ?? [], alertes: alertes.data ?? [], commandes: commandes.data ?? [], factures_supporter: factures.data ?? [],
  };
  return new Response(JSON.stringify(corps, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="ambiance-rugby-mes-donnees.json"` },
  });
}
