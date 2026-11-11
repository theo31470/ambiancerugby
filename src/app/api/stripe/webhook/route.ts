import type Stripe from "stripe";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { stripe } from "@/lib/shop/stripe";
import { commandePayee } from "@/lib/shop/traitement";
import { enregistrerFacture, synchroniser } from "@/lib/abonnement";
import { mailCommande, mailPaiementRefuse, mailRemboursementSupporter, mailsAbonnement, mailsFacturePayee } from "@/lib/email/envois";

/** Événements Stripe : boutique (paiement, remboursement) et abonnement Supporter (échéances, changements). Signature vérifiée. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook non configuré", { status: 500 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("signature invalide", { status: 400 });
  }
  const db = shopDb();
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid") {
      const { data } = await db.rpc("shop_lire_commande", { p_secret: null, p_session: s.id });
      const c = (data as Commande[] | null)?.[0];
      // montant contrôlé : le paiement doit correspondre exactement à la commande
      if (c && s.amount_total === c.total_cents) await commandePayee(c, typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null);
      else if (c) await db.rpc("shop_maj_commande", { p_secret: null, p_id: c.id, p_patch: { statut: "probleme", message: `Montant payé (${s.amount_total}) différent de la commande (${c.total_cents}).` } });
    }
  }
  if (event.type === "charge.refunded") {
    const ch = event.data.object as Stripe.Charge;
    const orderId = ch.metadata?.order_id;
    if (orderId && ch.refunded) {
      await db.rpc("shop_maj_commande", { p_secret: null, p_id: orderId, p_patch: { statut: "remboursee", message: "Commande remboursée." } });
      const { data } = await db.rpc("shop_lire_commande", { p_secret: null, p_id: orderId });
      const c = (data as Commande[] | null)?.[0];
      if (c) await mailCommande("commande_remboursee", c, { montantRembourseCents: ch.amount_refunded });
    } else if (!orderId && ch.amount_refunded > 0) await mailRemboursementSupporter(ch);
  }
  // abonnement Supporter : chaque échéance payée prolonge l'accès et produit une facture du site
  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice;
    const subId = inv.parent?.subscription_details?.subscription;
    if (subId) {
      const sub = await stripe().subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
      await synchroniser(sub);
      await enregistrerFacture(inv);
      await mailsFacturePayee(inv, sub, event.id);
    }
  }
  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    const subId = inv.parent?.subscription_details?.subscription;
    if (subId) await mailPaiementRefuse(inv, await stripe().subscriptions.retrieve(typeof subId === "string" ? subId : subId.id));
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await synchroniser(event.data.object as Stripe.Subscription);
    await mailsAbonnement(event.type, event.data.object as Stripe.Subscription, (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes);
  }
  return Response.json({ recu: true });
}
