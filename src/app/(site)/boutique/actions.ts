"use server";
import { headers } from "next/headers";
import { getViewer } from "@/lib/supabase/server";
import { shopDb, type ArticleCommande } from "@/lib/shop/admin";
import { tarifsLivraison } from "@/lib/shop/printful";
import { enModeTest, stripe } from "@/lib/shop/stripe";
import type { LignePanier } from "@/lib/shop/panier";

export type Adresse = { email: string; nom: string; adresse1: string; adresse2?: string; cp: string; ville: string; pays: string; tel?: string };
export type LigneDetaillee = ArticleCommande & { slug: string };

/** Recharge le panier depuis la base : prix, noms et disponibilité font foi côté serveur. */
export async function detaillerPanier(lignes: LignePanier[]): Promise<LigneDetaillee[]> {
  const ids = [...new Set(lignes.map((l) => l.variant_id))].filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (!ids.length) return [];
  const { data } = await shopDb().from("shop_variants")
    .select("id, label, price_cents, printful_sync_variant_id, printful_variant_id, image, active, product:shop_products!inner(name, slug, price_cents, images, active)")
    .in("id", ids);
  const out: LigneDetaillee[] = [];
  for (const l of lignes) {
    const v = (data ?? []).find((x) => x.id === l.variant_id) as unknown as {
      id: string; label: string; price_cents: number | null; printful_sync_variant_id: number | null; printful_variant_id: number | null; image: string | null; active: boolean;
      product: { name: string; slug: string; price_cents: number; images: string[]; active: boolean };
    } | undefined;
    if (!v || !v.active || !v.product.active) continue;
    out.push({
      variant_id: v.id, sync_variant_id: v.printful_sync_variant_id, catalogue_id: v.printful_variant_id, nom: v.product.name, detail: v.label, slug: v.product.slug,
      image: v.image ?? v.product.images[0] ?? null, prix_cents: v.price_cents ?? v.product.price_cents, quantite: Math.max(1, Math.min(20, Math.round(l.quantite))),
    });
  }
  return out;
}

/** Frais de port réels Printful pour l'adresse (option la moins chère). */
export async function estimerLivraison(lignes: LignePanier[], pays: string, cp: string, ville: string) {
  try {
    const items = await detaillerPanier(lignes);
    if (!items.length) return { ok: false as const, message: "Panier vide." };
    const manquant = items.find((i) => !i.sync_variant_id || !i.catalogue_id);
    if (manquant) return { ok: false as const, message: `« ${manquant.nom} (${manquant.detail}) » n'est pas encore relié à Printful : retirez-le du panier.` };
    const tarifs = await tarifsLivraison({ country_code: pays, zip: cp, city: ville }, items.map((i) => ({ variant_id: i.catalogue_id!, quantity: i.quantite })));
    if (!tarifs.length) return { ok: false as const, message: "Pas de livraison possible vers cette adresse." };
    const t = tarifs[0];
    return { ok: true as const, cents: Math.round(Number(t.rate) * 100), methode: t.id, libelle: t.name, delai: t.minDeliveryDays && t.maxDeliveryDays ? `${t.minDeliveryDays} à ${t.maxDeliveryDays} jours` : null };
  } catch (e) {
    return { ok: false as const, message: (e as Error).message };
  }
}

/** Crée la commande et la session de paiement Stripe intégrée au site ; renvoie le secret du formulaire de paiement. */
export async function preparerPaiement(lignes: LignePanier[], a: Adresse) {
  try {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) return { ok: false as const, message: "Adresse e-mail invalide." };
    if (![a.nom, a.adresse1, a.cp, a.ville, a.pays].every((x) => x && x.trim())) return { ok: false as const, message: "Adresse de livraison incomplète." };
    const items = await detaillerPanier(lignes);
    if (!items.length) return { ok: false as const, message: "Votre panier est vide." };
    const liv = await estimerLivraison(lignes, a.pays, a.cp, a.ville);
    if (!liv.ok) return { ok: false as const, message: liv.message };
    const sousTotal = items.reduce((s, i) => s + i.prix_cents * i.quantite, 0);
    const viewer = await getViewer();
    const db = shopDb();
    // boutique pas encore ouverte : seule la rédaction peut passer une commande d'essai (en brouillon chez Printful)
    const { data: reglages } = await db.from("shop_settings").select("mode_test").eq("id", 1).single();
    const fermee = reglages?.mode_test !== false;
    const staff = !!viewer && viewer.role !== "user";
    if (fermee && !enModeTest() && !staff) return { ok: false as const, message: "La boutique ouvre très bientôt : les commandes ne sont pas encore ouvertes." };
    const { data: cree, error } = await db.rpc("shop_creer_commande", {
      p_secret: null,
      p_commande: {
        user_id: viewer?.id ?? null, email: a.email.trim(), items, sous_total_cents: sousTotal, livraison_cents: liv.cents, total_cents: sousTotal + liv.cents,
        nom: a.nom.trim(), adresse1: a.adresse1.trim(), adresse2: a.adresse2?.trim() || null, cp: a.cp.trim(), ville: a.ville.trim(), pays: a.pays, tel: a.tel?.trim() || null,
        methode: liv.methode, mode_test: enModeTest() || fermee,
      },
    });
    if (error || !cree?.[0]) return { ok: false as const, message: error?.message ?? "Création de la commande impossible." };
    const { id, numero } = cree[0] as { id: string; numero: string };

    const h = await headers();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
    const session = await stripe().checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      customer_email: a.email.trim(),
      locale: "fr",
      line_items: [
        ...items.map((i) => ({
          quantity: i.quantite,
          price_data: { currency: "eur", unit_amount: i.prix_cents, product_data: { name: `${i.nom} (${i.detail})`, ...(i.image ? { images: [i.image] } : {}) } },
        })),
        { quantity: 1, price_data: { currency: "eur", unit_amount: liv.cents, product_data: { name: `Livraison : ${liv.libelle}` } } },
      ],
      metadata: { order_id: id, numero },
      payment_intent_data: { metadata: { order_id: id, numero }, description: `Commande ${numero}` },
      return_url: `${site}/boutique/merci?session_id={CHECKOUT_SESSION_ID}`,
    });
    await db.rpc("shop_maj_commande", { p_secret: null, p_id: id, p_patch: { stripe_session_id: session.id } });
    return { ok: true as const, clientSecret: session.client_secret!, numero };
  } catch (e) {
    return { ok: false as const, message: (e as Error).message };
  }
}
