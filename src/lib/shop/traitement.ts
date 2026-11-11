import { shopDb, type Commande } from "./admin";
import { mailCommande } from "@/lib/email/envois";
import { creerCommandePrintful, lireCommandePrintful, type CommandePrintful } from "./printful";

const maj = (id: string, patch: Record<string, unknown>) => shopDb().rpc("shop_maj_commande", { p_secret: null, p_id: id, p_patch: patch });

/** Après un paiement confirmé : facture, puis envoi en fabrication chez Printful (brouillon en mode test). */
export async function commandePayee(c: Commande, paymentIntent: string | null) {
  if (c.statut !== "en_attente") return; // déjà traitée (Stripe peut renvoyer l'événement)
  await maj(c.id, { statut: "payee", stripe_payment_intent: paymentIntent, message: "Paiement reçu, facture émise." });
  await mailCommande("commande_confirmee", c);
  try {
    const pf = await creerCommandePrintful({
      numero: c.numero,
      livraison: c.livraison_methode ?? "STANDARD",
      confirmer: !c.mode_test,
      destinataire: {
        name: c.livraison_nom ?? "", address1: c.livraison_adresse1 ?? "", address2: c.livraison_adresse2, city: c.livraison_ville ?? "",
        country_code: c.livraison_pays ?? "FR", zip: c.livraison_cp ?? "", phone: c.livraison_tel, email: c.email,
      },
      items: c.items.filter((i) => i.sync_variant_id).map((i) => ({ sync_variant_id: i.sync_variant_id!, quantity: i.quantite, retail_price: (i.prix_cents / 100).toFixed(2) })),
    });
    await maj(c.id, {
      printful_order_id: pf.id,
      ...(c.mode_test ? { message: "Mode test : commande créée en brouillon chez Printful (rien n'est fabriqué)." } : { statut: "en_fabrication", message: "Commande transmise à l'atelier." }),
    });
  } catch (e) {
    await maj(c.id, { statut: "probleme", message: `Envoi à Printful impossible : ${(e as Error).message}` });
  }
}

/** Met à jour une commande à partir de l'état réel chez Printful (on ne se fie jamais au contenu brut du webhook). */
export async function synchroniserPrintful(printfulId: number) {
  const { data } = await shopDb().rpc("shop_lire_commande", { p_secret: null, p_printful: printfulId });
  const c = (data as Commande[] | null)?.[0];
  if (!c) return null;
  const pf: CommandePrintful = await lireCommandePrintful(printfulId);
  const envoi = pf.shipments?.[pf.shipments.length - 1];
  if (envoi?.tracking_number && c.statut !== "livree") {
    await maj(c.id, { statut: "expediee", transporteur: envoi.carrier, suivi_numero: envoi.tracking_number, suivi_url: envoi.tracking_url, ...(c.statut !== "expediee" ? { message: `Colis confié à ${envoi.carrier}.` } : {}) });
    if (c.statut !== "expediee" || c.suivi_numero !== envoi.tracking_number) await mailCommande("commande_expediee", { ...c, transporteur: envoi.carrier, suivi_numero: envoi.tracking_number, suivi_url: envoi.tracking_url });
  } else if (pf.status === "inprocess" && ["payee"].includes(c.statut)) {
    await maj(c.id, { statut: "en_fabrication", message: "En cours de fabrication à l'atelier." });
  } else if (pf.status === "canceled" && !["annulee", "remboursee"].includes(c.statut)) {
    await maj(c.id, { statut: "annulee", message: "Commande annulée chez Printful." });
  } else if (["failed", "onhold"].includes(pf.status) && c.statut !== "probleme") {
    await maj(c.id, { statut: "probleme", message: pf.status === "onhold" ? "Commande en attente chez Printful : à vérifier." : "Échec chez Printful : à vérifier." });
  }
  return pf.status;
}
