import type Stripe from "stripe";
import { stripe, enModeTest } from "@/lib/shop/stripe";
import { shopDb } from "@/lib/shop/admin";
import { moyenDeFacture } from "@/lib/factures/donnees";

/** Les deux formules Supporter. Les prix Stripe sont créés à la première utilisation (clé de recherche stable : changer le prix = changer la clé). */
export const FORMULES = {
  mensuel: { cle: "supporter_mensuel_599", cents: 599, intervalle: "month" as const, libelle: "Supporter mensuel", prix: "5,99 €", rythme: "par mois" },
  annuel: { cle: "supporter_annuel_5900", cents: 5900, intervalle: "year" as const, libelle: "Supporter annuel", prix: "59 €", rythme: "par an" },
};
export type Formule = keyof typeof FORMULES;
export const estFormule = (f: unknown): f is Formule => f === "mensuel" || f === "annuel";

/** Identifiant du prix Stripe d'une formule (créé une fois, puis retrouvé par sa clé). */
export async function prixStripe(f: Formule) {
  const s = stripe();
  const def = FORMULES[f];
  const { data } = await s.prices.list({ lookup_keys: [def.cle], active: true, limit: 1 });
  if (data[0]) return data[0].id;
  // produit commun aux deux formules
  const autre = FORMULES[f === "mensuel" ? "annuel" : "mensuel"].cle;
  const { data: voisin } = await s.prices.list({ lookup_keys: [autre], active: true, limit: 1 });
  const produit = voisin[0] ? (typeof voisin[0].product === "string" ? voisin[0].product : voisin[0].product.id)
    : (await s.products.create({ name: "Ambiance Rugby Supporter", description: "Abonnement Supporter : stats complètes, alertes, contenus exclusifs, badge." })).id;
  const p = await s.prices.create({ product: produit, currency: "eur", unit_amount: def.cents, recurring: { interval: def.intervalle }, lookup_key: def.cle, nickname: def.libelle });
  return p.id;
}

const fin = (sub: Stripe.Subscription) => {
  const t = sub.items.data[0]?.current_period_end;
  return t ? new Date(t * 1000).toISOString() : null;
};
const formuleDe = (sub: Stripe.Subscription): Formule => (sub.items.data[0]?.price?.recurring?.interval === "year" ? "annuel" : "mensuel");

/** Recopie l'état d'un abonnement Stripe sur le profil du membre (clé service : contourne la protection du profil). */
export async function synchroniser(sub: Stripe.Subscription) {
  const db = shopDb();
  const userId = sub.metadata?.user_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const filtre = userId ? { col: "id", val: userId } : { col: "stripe_customer_id", val: customer };
  const actif = ["active", "trialing", "past_due"].includes(sub.status);
  const patch: Record<string, unknown> = {
    stripe_customer_id: customer, stripe_subscription_id: sub.id, plan_formule: formuleDe(sub), plan_statut: sub.status,
    plan_fin_prevue: !!sub.cancel_at_period_end || !!sub.cancel_at,
  };
  // l'accès court jusqu'à la fin de la période payée, même après une résiliation
  if (actif || sub.status === "canceled") { patch.plan = "supporter"; patch.plan_until = fin(sub); }
  if (sub.status === "incomplete" || sub.status === "incomplete_expired") delete patch.plan;
  await db.from("profiles").update(patch).eq(filtre.col, filtre.val);
}

/** Enregistre (une fois) la facture du site pour une échéance payée. */
export async function enregistrerFacture(inv: Stripe.Invoice) {
  if (inv.status !== "paid" || !inv.amount_paid) return null;
  const db = shopDb();
  const subId = inv.parent?.subscription_details?.subscription;
  const sub = subId ? await stripe().subscriptions.retrieve(typeof subId === "string" ? subId : subId.id) : null;
  const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  let userId = sub?.metadata?.user_id ?? null;
  if (!userId && customer) userId = (await db.from("profiles").select("id").eq("stripe_customer_id", customer).maybeSingle()).data?.id ?? null;
  if (!userId) return null;
  const ligne = inv.lines.data[0];
  const moyen = await moyenDeFacture(inv.id);
  const { data } = await db.from("supporter_factures").upsert({
    user_id: userId, stripe_invoice_id: inv.id, formule: sub ? formuleDe(sub) : "mensuel", montant_cents: inv.amount_paid,
    periode_debut: ligne?.period?.start ? new Date(ligne.period.start * 1000).toISOString() : null,
    periode_fin: ligne?.period?.end ? new Date(ligne.period.end * 1000).toISOString() : null,
    client_nom: inv.customer_name ?? null, client_email: inv.customer_email ?? null, client_adresse: inv.customer_address ?? null, moyen,
    payee_le: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
    mode_test: enModeTest(),
  }, { onConflict: "stripe_invoice_id" }).select("id, numero").single();
  if (data && !data.numero) await db.rpc("supporter_numeroter", { p_id: data.id });
  return data?.id ?? null;
}
