"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getViewer, hasBadge } from "@/lib/supabase/server";
import { stripe } from "@/lib/shop/stripe";
import { shopDb } from "@/lib/shop/admin";
import { enregistrerFacture, estFormule, FORMULES, prixStripe, synchroniser } from "@/lib/abonnement";

type Reponse<T> = ({ ok: true } & T) | { ok: false; message: string };

/** Client Stripe du membre (créé une fois, rattaché à son profil). */
async function clientStripe(viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>) {
  const db = shopDb();
  const { data: p } = await db.from("profiles").select("stripe_customer_id, display_name").eq("id", viewer.id).single();
  if (p?.stripe_customer_id) return p.stripe_customer_id as string;
  const c = await stripe().customers.create({ email: viewer.email ?? undefined, name: p?.display_name ?? undefined, metadata: { user_id: viewer.id } });
  await db.from("profiles").update({ stripe_customer_id: c.id }).eq("id", viewer.id);
  return c.id;
}

/** Google Pay / Apple Pay demandent que le domaine du site soit déclaré : fait une fois, sans bloquer en cas d'échec. */
async function declarerDomaine() {
  try {
    const h = await headers();
    const domaine = (h.get("host") ?? "").split(":")[0];
    if (!domaine || domaine === "localhost") return;
    const { data } = await stripe().paymentMethodDomains.list({ domain_name: domaine, limit: 1 });
    if (!data.length) await stripe().paymentMethodDomains.create({ domain_name: domaine });
  } catch { /* les autres moyens de paiement restent disponibles */ }
}

/** Prépare l'abonnement et renvoie le secret qui permet d'afficher le formulaire de paiement dans la page. */
export async function demarrerAbonnement(formule: string): Promise<Reponse<{ secret: string; abonnement: string; montant: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, message: "Connectez-vous pour devenir Supporter." };
    if (hasBadge(viewer) && viewer.role === "user") return { ok: false, message: "Vous êtes déjà Supporter. Merci !" };
    if (!estFormule(formule)) return { ok: false, message: "Formule inconnue." };
    const s = stripe();
    const customer = await clientStripe(viewer);
    // un essai précédent resté inachevé est abandonné
    const { data: enCours } = await s.subscriptions.list({ customer, status: "incomplete", limit: 10 });
    for (const x of enCours) await s.subscriptions.cancel(x.id).catch(() => null);
    await declarerDomaine();
    const sub = await s.subscriptions.create({
      customer,
      items: [{ price: await prixStripe(formule) }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { user_id: viewer.id, formule },
      expand: ["latest_invoice.confirmation_secret"],
    });
    const inv = sub.latest_invoice;
    const secret = inv && typeof inv !== "string" ? inv.confirmation_secret?.client_secret : null;
    if (!secret) return { ok: false, message: "Le paiement n'a pas pu être préparé. Réessayez dans un instant." };
    return { ok: true, secret, abonnement: sub.id, montant: FORMULES[formule].prix };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Appelé à l'ouverture de la caisse : déclare le domaine pour Google Pay / Apple Pay. */
export async function preparerCaisse() {
  await declarerDomaine();
}

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Code promo : vérifie qu'il existe et renvoie la remise à afficher avant le paiement. */
export async function verifierCodePromo(code: string, formule: string): Promise<Reponse<{ id: string; libelle: string; cents: number }>> {
  try {
    const c = code.trim();
    if (!c || !estFormule(formule)) return { ok: false, message: "Saisissez un code." };
    const { data } = await stripe().promotionCodes.list({ code: c, active: true, limit: 1, expand: ["data.promotion.coupon"] });
    const p = data[0];
    const coupon = p && typeof p.promotion?.coupon === "object" ? p.promotion.coupon : null;
    if (!p || !coupon || !coupon.valid) return { ok: false, message: "Ce code n'existe pas ou n'est plus valable." };
    const base = FORMULES[formule].cents;
    const remise = coupon.percent_off ? Math.round(base * coupon.percent_off / 100) : Math.min(base, coupon.amount_off ?? 0);
    const libelle = coupon.percent_off ? `−${coupon.percent_off} %` : `−${(remise / 100).toFixed(2).replace(".", ",")} €`;
    return { ok: true, id: p.id, libelle, cents: base - remise };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/**
 * Notre propre caisse : la carte est saisie et vérifiée dans la page (elements.submit),
 * puis on crée l'abonnement avec les informations de facturation et on renvoie le secret à confirmer.
 */
export async function lancerAbonnement(fd: FormData): Promise<Reponse<{ secret: string | null; abonnement: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, message: "Connectez-vous pour devenir Supporter." };
    if (hasBadge(viewer) && viewer.role === "user") return { ok: false, message: "Vous êtes déjà Supporter. Merci !" };
    const formule = texte(fd, "formule", 10);
    if (!estFormule(formule)) return { ok: false, message: "Formule inconnue." };
    const nom = texte(fd, "nom", 120), ligne1 = texte(fd, "ligne1"), cp = texte(fd, "cp", 20), ville = texte(fd, "ville", 100);
    const pays = texte(fd, "pays", 2).toUpperCase() || "FR";
    if (nom.length < 2) return { ok: false, message: "Indiquez le nom qui figurera sur vos factures." };
    if (!ligne1 || !cp || !ville) return { ok: false, message: "Complétez votre adresse de facturation." };
    const s = stripe();
    const customer = await clientStripe(viewer);
    await s.customers.update(customer, { name: nom, address: { line1: ligne1, line2: texte(fd, "ligne2") || undefined, postal_code: cp, city: ville, country: pays } });
    const { data: enCours } = await s.subscriptions.list({ customer, status: "incomplete", limit: 10 });
    for (const x of enCours) await s.subscriptions.cancel(x.id).catch(() => null);
    const promo = texte(fd, "promo", 60);
    const sub = await s.subscriptions.create({
      customer,
      items: [{ price: await prixStripe(formule) }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      ...(promo ? { discounts: [{ promotion_code: promo }] } : {}),
      metadata: { user_id: viewer.id, formule },
      expand: ["latest_invoice.confirmation_secret"],
    });
    const inv = sub.latest_invoice;
    const secret = inv && typeof inv !== "string" ? inv.confirmation_secret?.client_secret ?? null : null;
    // code à 100 % : rien à payer, l'abonnement est déjà actif
    if (!secret && sub.status !== "active") return { ok: false, message: "Le paiement n'a pas pu être préparé. Réessayez dans un instant." };
    return { ok: true, secret, abonnement: sub.id };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Au retour du paiement : met le profil à jour sans attendre le message de Stripe. */
export async function verifierAbonnement(abonnement: string, revalider = true): Promise<Reponse<{ actif: boolean }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, message: "Session expirée." };
    const sub = await stripe().subscriptions.retrieve(abonnement, { expand: ["latest_invoice"] });
    if (sub.metadata?.user_id !== viewer.id) return { ok: false, message: "Abonnement introuvable." };
    await synchroniser(sub);
    if (sub.latest_invoice && typeof sub.latest_invoice !== "string") await enregistrerFacture(sub.latest_invoice);
    if (revalider) revalidatePath("/", "layout");
    return { ok: true, actif: ["active", "trialing"].includes(sub.status) };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

async function monAbonnement() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Connectez-vous.");
  const { data } = await shopDb().from("profiles").select("stripe_subscription_id, stripe_customer_id").eq("id", viewer.id).single();
  if (!data?.stripe_subscription_id) throw new Error("Aucun abonnement en cours.");
  return { viewer, sub: data.stripe_subscription_id as string, customer: data.stripe_customer_id as string };
}

/** Résilier (l'accès reste jusqu'à la fin de la période payée) ou reprendre avant cette date. */
export async function resilier(form: FormData) {
  const { sub } = await monAbonnement();
  const reprendre = form.get("reprendre") === "1";
  await synchroniser(await stripe().subscriptions.update(sub, { cancel_at_period_end: !reprendre }));
  revalidatePath("/compte/abonnement");
}

/** Changer de moyen de paiement, dans la page : renvoie le secret du formulaire d'enregistrement de carte. */
export async function preparerNouveauMoyen(): Promise<Reponse<{ secret: string }>> {
  try {
    const { customer } = await monAbonnement();
    const si = await stripe().setupIntents.create({ customer, usage: "off_session", automatic_payment_methods: { enabled: true } });
    return { ok: true, secret: si.client_secret! };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Le nouveau moyen enregistré devient celui de l'abonnement. */
export async function appliquerNouveauMoyen(setupIntent: string): Promise<Reponse<object>> {
  try {
    const { sub, customer } = await monAbonnement();
    const si = await stripe().setupIntents.retrieve(setupIntent);
    if (si.customer !== customer || si.status !== "succeeded" || !si.payment_method) return { ok: false, message: "Le moyen de paiement n'a pas été validé." };
    const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method.id;
    await stripe().subscriptions.update(sub, { default_payment_method: pm });
    await stripe().customers.update(customer, { invoice_settings: { default_payment_method: pm } });
    revalidatePath("/compte/abonnement");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
