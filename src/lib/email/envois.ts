import type Stripe from "stripe";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { boutiqueEmail, supporterEmail, type SupporterTemplate } from "./templates";
import { sendEmail, siteUrl } from "./send";

/** Envois automatiques : abonnement Supporter (Stripe) et boutique (Stripe + Printful). Aucun ne bloque le traitement en cas d'échec. */

async function profil(userId: string | null | undefined, customer: string | null | undefined) {
  const db = shopDb();
  const q = db.from("profiles").select("id, display_name, plan_formule");
  const { data } = userId ? await q.eq("id", userId).maybeSingle() : customer ? await q.eq("stripe_customer_id", customer).maybeSingle() : { data: null };
  if (!data) return null;
  const { data: u } = await db.auth.admin.getUserById(data.id);
  return { id: data.id as string, nom: (data.display_name as string | null) ?? null, email: u.user?.email ?? null, formule: (data.plan_formule === "annuel" ? "annuel" : "mensuel") as "mensuel" | "annuel" };
}

const formuleDe = (sub: Stripe.Subscription | null) => (sub?.items.data[0]?.price?.recurring?.interval === "year" ? "annuel" : "mensuel");
const fin = (t?: number | null) => (t ? new Date(t * 1000).toISOString() : null);

async function carteDe(inv: Stripe.Invoice) {
  try {
    const { stripe } = await import("@/lib/shop/stripe");
    const pi = inv.payments?.data?.[0]?.payment?.payment_intent;
    const id = typeof pi === "string" ? pi : pi?.id;
    if (!id) return null;
    const p = await stripe().paymentIntents.retrieve(id, { expand: ["payment_method"] });
    const pm = p.payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) return `${pm.card.brand.charAt(0).toUpperCase()}${pm.card.brand.slice(1)} •••• ${pm.card.last4}`;
    if (pm?.type === "paypal") return "PayPal";
    return null;
  } catch {
    return null;
  }
}

/** Échéance payée : facture à chaque fois, et e-mail de bienvenue à la première. */
export async function mailsFacturePayee(inv: Stripe.Invoice, sub: Stripe.Subscription | null, eventId: string) {
  const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  const p = await profil(sub?.metadata?.user_id, customer);
  const to = p?.email ?? inv.customer_email;
  if (!to) return;
  const { data: f } = await shopDb().from("supporter_factures").select("numero").eq("stripe_invoice_id", inv.id).maybeSingle();
  const ligne = inv.lines.data[0];
  const commun = { name: p?.nom ?? inv.customer_name, formule: formuleDe(sub) as "mensuel" | "annuel" };
  const site = siteUrl();
  if (inv.billing_reason === "subscription_create") {
    await sendEmail({ to, kind: "supporter", template: "bienvenue", userId: p?.id, email: supporterEmail("bienvenue", { ...commun, periodeFin: fin(ligne?.period?.end) }, site) }, { idempotencyKey: `bienvenue-${inv.id}` });
  }
  await sendEmail({
    to, kind: "supporter", template: "facture", userId: p?.id,
    email: supporterEmail("facture", {
      ...commun, montantCents: inv.amount_paid, numero: f?.numero ?? null, date: fin(inv.status_transitions?.paid_at) ?? new Date().toISOString(),
      periodeDebut: fin(ligne?.period?.start), periodeFin: fin(ligne?.period?.end), carte: await carteDe(inv),
    }, site),
  }, { idempotencyKey: `facture-${inv.id}-${eventId}` });
}

/** Échéance refusée par la banque. */
export async function mailPaiementRefuse(inv: Stripe.Invoice, sub: Stripe.Subscription | null) {
  if (inv.billing_reason === "subscription_create") return; // première tentative : l'erreur s'affiche déjà dans la caisse
  const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  const p = await profil(sub?.metadata?.user_id, customer);
  const to = p?.email ?? inv.customer_email;
  if (!to) return;
  await sendEmail({ to, kind: "supporter", template: "paiement_refuse", userId: p?.id, email: supporterEmail("paiement_refuse", { name: p?.nom, formule: formuleDe(sub) as "mensuel" | "annuel", montantCents: inv.amount_due, carte: await carteDe(inv) }, siteUrl()) }, { idempotencyKey: `refus-${inv.id}-${inv.attempt_count}` });
}

/** Changement d'abonnement : résiliation programmée, ou fin effective. */
export async function mailsAbonnement(type: string, sub: Stripe.Subscription, avant: Partial<Stripe.Subscription> | undefined) {
  let template: SupporterTemplate | null = null;
  const programmee = !!sub.cancel_at_period_end || !!sub.cancel_at;
  if (type === "customer.subscription.updated" && programmee && avant && ("cancel_at_period_end" in avant || "cancel_at" in avant) && !(avant.cancel_at_period_end || avant.cancel_at)) template = "resiliation";
  if (type === "customer.subscription.deleted" && sub.status === "canceled") template = "termine";
  if (!template) return;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const p = await profil(sub.metadata?.user_id, customer);
  if (!p?.email) return;
  await sendEmail({ to: p.email, kind: "supporter", template, userId: p.id, email: supporterEmail(template, { name: p.nom, formule: formuleDe(sub) as "mensuel" | "annuel", finAcces: fin(sub.items.data[0]?.current_period_end) }, siteUrl()) }, { idempotencyKey: `${template}-${sub.id}-${sub.cancel_at ?? sub.ended_at ?? ""}` });
}

/** Remboursement d'une échéance Supporter (pas d'une commande boutique). */
export async function mailRemboursementSupporter(ch: Stripe.Charge) {
  if (ch.metadata?.order_id) return;
  const customer = typeof ch.customer === "string" ? ch.customer : ch.customer?.id;
  const p = await profil(null, customer);
  if (!p?.email) return;
  const carte = ch.payment_method_details?.card ? `${ch.payment_method_details.card.brand ?? "Carte"} •••• ${ch.payment_method_details.card.last4}` : null;
  await sendEmail({ to: p.email, kind: "supporter", template: "remboursement", userId: p.id, email: supporterEmail("remboursement", { name: p.nom, formule: p.formule, montantCents: ch.amount_refunded, carte }, siteUrl()) }, { idempotencyKey: `remb-${ch.id}-${ch.amount_refunded}` });
}

// ------------------------------------------------------------------ boutique

function entree(c: Commande) {
  return {
    name: c.livraison_nom, numero: c.numero, email: c.email,
    articles: c.items.map((a) => ({ nom: a.nom, detail: a.detail, quantite: a.quantite, prixCents: a.prix_cents })),
    livraisonCents: c.livraison_cents, totalCents: c.total_cents,
    adresse: [c.livraison_nom, [c.livraison_adresse1, c.livraison_adresse2].filter(Boolean).join(", "), [c.livraison_cp, c.livraison_ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    transporteur: c.transporteur, suiviNumero: c.suivi_numero, suiviUrl: c.suivi_url,
  };
}

export async function mailCommande(template: "commande_confirmee" | "commande_expediee" | "commande_remboursee", c: Commande, extra: { montantRembourseCents?: number } = {}) {
  if (!c.email) return;
  await sendEmail({ to: c.email, kind: "boutique", template, email: boutiqueEmail(template, { ...entree(c), ...extra }, siteUrl()) }, { idempotencyKey: `${template}-${c.id}${template === "commande_expediee" ? `-${c.suivi_numero ?? ""}` : ""}` });
}
