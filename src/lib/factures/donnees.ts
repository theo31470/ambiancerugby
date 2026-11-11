import type Stripe from "stripe";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { stripe } from "@/lib/shop/stripe";
import { rendrePdf } from "./pdf";
import { dateCourte, dateLongue, type Client, type DocumentFacture, type LigneDoc, type Vendeur } from "./types";

/** Construit les documents (facture Supporter, facture boutique, avoir) à partir des copies en base. */

export async function vendeur(): Promise<Vendeur> {
  const { data: v } = await shopDb().from("shop_settings").select("vendeur_titulaire,vendeur_adresse,vendeur_siret,vendeur_email,mention_tva").eq("id", 1).single();
  return {
    nom: v?.vendeur_titulaire ?? "",
    adresse: v?.vendeur_adresse ?? "", siret: v?.vendeur_siret ?? "", email: v?.vendeur_email ?? "contact@ambiance-rugby.fr",
    mention_tva: v?.mention_tva ?? "TVA non applicable, art. 293 B du CGI",
  };
}

export type FactureSupporterRow = {
  id: string; user_id: string; numero: string | null; formule: string; montant_cents: number; periode_debut: string | null; periode_fin: string | null;
  client_nom: string | null; client_email: string | null; client_adresse: Partial<Stripe.Address> | null; moyen: string | null; mode_test: boolean; payee_le: string; created_at: string;
};

export function docSupporter(f: FactureSupporterRow): DocumentFacture {
  const a = f.client_adresse ?? {};
  const libelle = f.formule === "annuel" ? "Abonnement Supporter annuel" : "Abonnement Supporter mensuel";
  return {
    type: "facture", numero: f.numero ?? "", emis_le: f.payee_le, regle_le: f.payee_le, moyen: f.moyen, mode_test: f.mode_test,
    client: { nom: f.client_nom ?? "", email: f.client_email ?? "", ligne1: a.line1, ligne2: a.line2, cp: a.postal_code, ville: a.city, pays: a.country },
    periode: f.periode_debut && f.periode_fin ? `${dateCourte(f.periode_debut)} au ${dateCourte(f.periode_fin)}` : null,
    lignes: [{ label: libelle, detail: f.periode_debut && f.periode_fin ? `Du ${dateLongue(f.periode_debut)} au ${dateLongue(f.periode_fin)}` : null, quantite: 1, unite_cents: f.montant_cents, total_cents: f.montant_cents }],
    total_cents: f.montant_cents,
  };
}

export function clientCommande(c: Commande): Client {
  return { nom: c.livraison_nom ?? "", email: c.email, ligne1: c.livraison_adresse1, ligne2: c.livraison_adresse2, cp: c.livraison_cp, ville: c.livraison_ville, pays: c.livraison_pays };
}

export function lignesCommande(c: Commande): LigneDoc[] {
  return [
    ...c.items.map((a) => ({ label: a.nom, detail: a.detail || null, quantite: a.quantite, unite_cents: a.prix_cents, total_cents: a.prix_cents * a.quantite })),
    ...(c.livraison_cents ? [{ label: "Livraison", detail: c.livraison_methode === "STANDARD" || !c.livraison_methode ? "Envoi standard" : c.livraison_methode, quantite: 1, unite_cents: c.livraison_cents, total_cents: c.livraison_cents }] : []),
  ];
}

export function docCommande(c: Commande & { moyen?: string | null }): DocumentFacture {
  return {
    type: "facture", numero: c.facture_numero ?? "", emis_le: c.facture_date ?? c.paye_at ?? c.created_at, regle_le: c.paye_at ?? c.facture_date, moyen: c.moyen ?? null,
    mode_test: c.mode_test, client: clientCommande(c), lignes: lignesCommande(c), total_cents: c.total_cents,
  };
}

export type AvoirRow = {
  id: string; numero: string | null; source: "supporter" | "boutique"; user_id: string | null; order_id: string | null; facture_origine: string | null;
  montant_cents: number; motif: string | null; lignes: LigneDoc[]; client: Client; moyen: string | null; rembourse_le: string; mode_test: boolean;
};

export function docAvoir(a: AvoirRow): DocumentFacture {
  return {
    type: "avoir", numero: a.numero ?? "", emis_le: a.rembourse_le, regle_le: a.rembourse_le, client: a.client, lignes: a.lignes, total_cents: a.montant_cents,
    moyen: a.moyen, facture_origine: a.facture_origine, motif: a.motif, mode_test: a.mode_test,
  };
}

export async function pdfDe(doc: DocumentFacture) {
  return rendrePdf(doc, await vendeur());
}

/** « Visa •••• 4242 », « PayPal », à partir d'un paiement Stripe. */
export async function moyenDePaiement(paymentIntent: string | null | undefined) {
  if (!paymentIntent) return null;
  try {
    const p = await stripe().paymentIntents.retrieve(paymentIntent, { expand: ["payment_method"] });
    const pm = p.payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) return `${pm.card.brand.charAt(0).toUpperCase()}${pm.card.brand.slice(1)} •••• ${pm.card.last4}`;
    if (pm?.type === "paypal") return "PayPal";
    if (pm?.type) return pm.type;
    return null;
  } catch {
    return null;
  }
}
export function moyenDeCharge(ch: Stripe.Charge) {
  const d = ch.payment_method_details;
  if (d?.card) return `${(d.card.brand ?? "Carte").charAt(0).toUpperCase()}${(d.card.brand ?? "carte").slice(1)} •••• ${d.card.last4}`;
  if (d?.type === "paypal") return "PayPal";
  return null;
}

/** Moyen de paiement d'une facture Stripe (les paiements ne sont pas inclus dans l'événement : on les relit). */
export async function moyenDeFacture(invoiceId: string) {
  try {
    const { data } = await stripe().invoicePayments.list({ invoice: invoiceId, limit: 1 });
    const pi = data[0]?.payment?.payment_intent;
    return moyenDePaiement(typeof pi === "string" ? pi : pi?.id);
  } catch {
    return null;
  }
}
