import { publicClient } from "@/lib/supabase/server";

export type InfosVendeur = { nom: string; titulaire: string; adresse: string; siret: string; email: string; tva: string; mediateur: string | null };

/** Identité du vendeur pour les pages légales (réglée dans le studio, comme sur les factures). */
export async function infosVendeur(): Promise<InfosVendeur> {
  const { data: v } = await publicClient().from("shop_settings").select("vendeur_nom,vendeur_titulaire,vendeur_adresse,vendeur_siret,vendeur_email,mention_tva,mediateur").eq("id", 1).maybeSingle();
  return {
    nom: v?.vendeur_nom ?? "Ambiance Rugby", titulaire: v?.vendeur_titulaire ?? "", adresse: v?.vendeur_adresse ?? "", siret: v?.vendeur_siret ?? "",
    email: v?.vendeur_email ?? "contact@ambiance-rugby.fr", tva: v?.mention_tva ?? "TVA non applicable, art. 293 B du CGI", mediateur: v?.mediateur ?? null,
  };
}
