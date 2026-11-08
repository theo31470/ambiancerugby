import { createClient } from "@supabase/supabase-js";

/** Accès serveur à la base pour la boutique (commandes des invités, webhooks). Jamais envoyé au navigateur. */
export function shopDb() {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) throw new Error("La clé SUPABASE_SERVICE_ROLE_KEY n'est pas encore configurée sur Vercel.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, cle, { auth: { persistSession: false } });
}

export type Commande = {
  id: string; numero: string; email: string; statut: Statut; items: ArticleCommande[];
  sous_total_cents: number; livraison_cents: number; total_cents: number;
  livraison_nom: string | null; livraison_adresse1: string | null; livraison_adresse2: string | null; livraison_cp: string | null;
  livraison_ville: string | null; livraison_pays: string | null; livraison_tel: string | null; livraison_methode: string | null;
  stripe_session_id: string | null; printful_order_id: number | null; transporteur: string | null; suivi_numero: string | null; suivi_url: string | null;
  facture_numero: string | null; facture_date: string | null; mode_test: boolean; created_at: string;
  paye_at: string | null; fabrication_at: string | null; expedie_at: string | null; livre_at: string | null;
};
export type ArticleCommande = { variant_id: string; sync_variant_id: number | null; catalogue_id?: number | null; nom: string; detail: string; image: string | null; prix_cents: number; quantite: number };
export type Statut = "en_attente" | "payee" | "en_fabrication" | "expediee" | "livree" | "annulee" | "remboursee" | "probleme";

export const STATUTS: Record<Statut, string> = {
  en_attente: "En attente de paiement", payee: "Payée", en_fabrication: "En fabrication", expediee: "Expédiée",
  livree: "Livrée", annulee: "Annulée", remboursee: "Remboursée", probleme: "Problème",
};
