import type Stripe from "stripe";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { stripe } from "@/lib/shop/stripe";
import { clientCommande, lignesCommande, moyenDeCharge, type AvoirRow, type FactureSupporterRow } from "./donnees";
import type { LigneDoc } from "./types";

const MOTIFS: Record<string, string> = {
  requested_by_customer: "Remboursement à la demande du client.",
  duplicate: "Paiement effectué en double.",
  fraudulent: "Paiement contesté.",
};

/**
 * Un remboursement Stripe = un avoir numéroté (A-AAAA-XXXX), une seule fois par remboursement.
 * Renvoie les avoirs créés pour cette charge (pour les envoyer par e-mail).
 */
export async function avoirsPourCharge(ch: Stripe.Charge): Promise<AvoirRow[]> {
  const db = shopDb();
  const { data: refunds } = await stripe().refunds.list({ charge: ch.id, limit: 100 });
  const reussis = refunds.filter((r) => r.status === "succeeded" || r.status === "pending");
  if (!reussis.length) return [];
  const { data: deja } = await db.from("avoirs").select("stripe_refund_id").in("stripe_refund_id", reussis.map((r) => r.id));
  const faits = new Set((deja ?? []).map((x) => x.stripe_refund_id));
  const moyen = moyenDeCharge(ch);
  const crees: AvoirRow[] = [];

  for (const r of reussis.filter((x) => !faits.has(x.id))) {
    const motif = (r.metadata?.motif as string | undefined) || (r.reason ? MOTIFS[r.reason] : null) || null;
    const quand = new Date(r.created * 1000).toISOString();
    let row: Record<string, unknown> | null = null;

    const orderId = ch.metadata?.order_id;
    if (orderId) {
      const { data } = await db.rpc("shop_lire_commande", { p_secret: null, p_id: orderId });
      const c = (data as Commande[] | null)?.[0];
      if (!c) continue;
      const total = r.amount >= c.total_cents;
      const lignes: LigneDoc[] = total ? lignesCommande(c) : [{ label: `Remboursement partiel de la commande ${c.numero}`, detail: motif, quantite: 1, unite_cents: r.amount, total_cents: r.amount }];
      const { data: u } = await db.from("shop_orders").select("user_id").eq("id", c.id).maybeSingle();
      row = { source: "boutique", order_id: c.id, user_id: u?.user_id ?? null, facture_origine: c.facture_numero, client: clientCommande(c), lignes, mode_test: c.mode_test };
    } else {
      // échéance Supporter : on retrouve la facture par le paiement
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      let factureId: string | null = null;
      if (pi) {
        const { data: paiements } = await stripe().invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pi }, limit: 1 });
        const inv = paiements[0]?.invoice;
        const invId = typeof inv === "string" ? inv : inv?.id;
        if (invId) factureId = (await db.from("supporter_factures").select("id").eq("stripe_invoice_id", invId).maybeSingle()).data?.id ?? null;
      }
      const customer = typeof ch.customer === "string" ? ch.customer : ch.customer?.id;
      if (!factureId && customer) {
        const { data: p } = await db.from("profiles").select("id").eq("stripe_customer_id", customer).maybeSingle();
        if (p) factureId = (await db.from("supporter_factures").select("id").eq("user_id", p.id).order("payee_le", { ascending: false }).limit(1).maybeSingle()).data?.id ?? null;
      }
      if (!factureId) continue;
      const { data: f } = await db.from("supporter_factures").select("*").eq("id", factureId).single<FactureSupporterRow>();
      if (!f) continue;
      const a = f.client_adresse ?? {};
      const libelle = f.formule === "annuel" ? "Abonnement Supporter annuel" : "Abonnement Supporter mensuel";
      const partiel = r.amount < f.montant_cents;
      row = {
        source: "supporter", supporter_facture_id: f.id, user_id: f.user_id, facture_origine: f.numero, mode_test: f.mode_test,
        client: { nom: f.client_nom ?? "", email: f.client_email ?? "", ligne1: a.line1, ligne2: a.line2, cp: a.postal_code, ville: a.city, pays: a.country },
        lignes: [{ label: partiel ? `${libelle} (remboursement partiel)` : libelle, detail: motif, quantite: 1, unite_cents: r.amount, total_cents: r.amount }],
      };
    }

    const { data: ins, error } = await db.from("avoirs").insert({ ...row, stripe_refund_id: r.id, montant_cents: r.amount, motif, moyen, rembourse_le: quand }).select("id").single();
    if (error) { if (error.code !== "23505") console.error("[avoir]", error.message); continue; }
    await db.rpc("avoir_numeroter", { p_id: ins.id });
    const { data: complet } = await db.from("avoirs").select("*").eq("id", ins.id).single<AvoirRow>();
    if (complet) crees.push(complet);
  }
  return crees;
}
