import { createClient, getViewer } from "@/lib/supabase/server";
import type { Commande } from "./admin";

export type Etape = { statut: string; message: string | null; date: string };

/** Une commande lisible par le visiteur : avec son e-mail (invité), ou parce qu'elle est à lui (connecté), ou par la rédaction. */
export async function lireCommandeVisiteur(numero: string, email?: string | null): Promise<{ commande: Commande; etapes: Etape[] } | null> {
  const db = await createClient();
  if (email) {
    const { data } = await db.rpc("shop_suivi", { p_numero: numero, p_email: email });
    return (data as { commande: Commande; etapes: Etape[] } | null) ?? null;
  }
  const viewer = await getViewer();
  if (!viewer) return null;
  const { data: c } = await db.from("shop_orders").select("*").ilike("numero", numero).neq("statut", "en_attente").maybeSingle();
  if (!c) return null;
  const { data: e } = await db.from("shop_order_events").select("statut,message,created_at").eq("order_id", c.id).order("created_at");
  return { commande: c as Commande, etapes: (e ?? []).map((x) => ({ statut: x.statut, message: x.message, date: x.created_at })) };
}
