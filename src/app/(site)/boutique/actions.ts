"use server";
import { headers } from "next/headers";
import { getViewer } from "@/lib/supabase/server";
import { shopDb, type ArticleCommande } from "@/lib/shop/admin";
import { tarifsLivraison } from "@/lib/shop/printful";
import { enModeTest, stripe } from "@/lib/shop/stripe";
import { euros } from "@/lib/shop/format";
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

type CodeLu = { code: string; type: "pourcentage" | "montant" | "livraison"; valeur: number; minimum_cents: number };

/** Lit un code promo et vérifie qu'il est utilisable pour ce montant. */
async function lireCode(saisi: string, sousTotal: number): Promise<{ ok: true; c: CodeLu } | { ok: false; message: string }> {
  const code = saisi.trim().toUpperCase();
  if (!code) return { ok: false, message: "Saisissez un code." };
  const { data: c } = await shopDb().from("shop_codes").select("code,type,valeur,minimum_cents,debut,fin,max_utilisations,utilisations,actif").eq("code", code).maybeSingle();
  const maintenant = Date.now();
  if (!c || !c.actif || (c.debut && new Date(c.debut).getTime() > maintenant)) return { ok: false, message: "Ce code n'existe pas." };
  if (c.fin && new Date(c.fin).getTime() < maintenant) return { ok: false, message: "Ce code a expiré." };
  if (c.max_utilisations != null && c.utilisations >= c.max_utilisations) return { ok: false, message: "Ce code a déjà été utilisé le nombre de fois prévu." };
  if (sousTotal < c.minimum_cents) return { ok: false, message: `Ce code est valable dès ${euros(c.minimum_cents)} d'achat.` };
  return { ok: true, c: c as CodeLu };
}

// il reste toujours au moins 0,50 € d'articles à payer (minimum de Stripe)
const remiseDe = (c: CodeLu | null, sousTotal: number) =>
  Math.max(0, Math.min(sousTotal - 50, !c ? 0 : c.type === "pourcentage" ? Math.round((sousTotal * Math.min(100, c.valeur)) / 100) : c.type === "montant" ? c.valeur : 0));

export type Devis = {
  sousTotal: number; remise: number; code: string | null; libelleCode: string | null;
  livraison: { cents: number; brut: number; offerte: boolean; methode: string; libelle: string; delai: string | null } | null;
  total: number; seuil: number | null;
};

/**
 * Le prix complet d'un panier : articles, remise du code promo, frais de port réels Printful (option la moins chère),
 * livraison offerte au-delà du seuil réglé dans le studio ou avec un code « livraison ».
 */
export async function calculerDevis(lignes: LignePanier[], dest: { pays: string; cp: string; ville: string } | null, code: string | null):
  Promise<{ ok: true; devis: Devis; items: LigneDetaillee[] } | { ok: false; message: string; codeInvalide?: boolean }> {
  try {
    const items = await detaillerPanier(lignes);
    if (!items.length) return { ok: false, message: "Votre panier est vide." };
    const sousTotal = items.reduce((s, i) => s + i.prix_cents * i.quantite, 0);
    let c: CodeLu | null = null;
    if (code?.trim()) {
      const r = await lireCode(code, sousTotal);
      if (!r.ok) return { ok: false, message: r.message, codeInvalide: true };
      c = r.c;
    }
    const remise = remiseDe(c, sousTotal);
    const { data: reglages } = await shopDb().from("shop_settings").select("livraison_offerte_cents").eq("id", 1).single();
    const seuil = reglages?.livraison_offerte_cents && reglages.livraison_offerte_cents > 0 ? reglages.livraison_offerte_cents : null;
    let livraison: Devis["livraison"] = null;
    if (dest?.cp.trim() && dest.ville.trim()) {
      const manquant = items.find((i) => !i.sync_variant_id || !i.catalogue_id);
      if (manquant) return { ok: false, message: `« ${manquant.nom} (${manquant.detail}) » n'est pas encore relié à l'atelier : retirez-le du panier.` };
      const tarifs = await tarifsLivraison({ country_code: dest.pays, zip: dest.cp, city: dest.ville }, items.map((i) => ({ variant_id: i.catalogue_id!, quantity: i.quantite })));
      if (!tarifs.length) return { ok: false, message: "Pas de livraison possible vers cette adresse." };
      const t = tarifs[0];
      const brut = Math.round(Number(t.rate) * 100);
      const offerte = c?.type === "livraison" || (seuil != null && sousTotal - remise >= seuil);
      livraison = { cents: offerte ? 0 : brut, brut, offerte, methode: t.id, libelle: t.name, delai: t.minDeliveryDays && t.maxDeliveryDays ? `${t.minDeliveryDays} à ${t.maxDeliveryDays} jours` : null };
    }
    const libelleCode = !c ? null : c.type === "pourcentage" ? `-${c.valeur} %` : c.type === "montant" ? `-${euros(c.valeur)}` : "Livraison offerte";
    return { ok: true, items, devis: { sousTotal, remise, code: c?.code ?? null, libelleCode, livraison, total: sousTotal - remise + (livraison?.cents ?? 0), seuil } };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Crée la commande et la session de paiement Stripe intégrée au site ; renvoie le secret du formulaire de paiement. */
export async function preparerPaiement(lignes: LignePanier[], a: Adresse, code: string | null) {
  try {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) return { ok: false as const, message: "Adresse e-mail invalide." };
    if (![a.nom, a.adresse1, a.cp, a.ville, a.pays].every((x) => x && x.trim())) return { ok: false as const, message: "Adresse de livraison incomplète." };
    const r = await calculerDevis(lignes, { pays: a.pays, cp: a.cp, ville: a.ville }, code);
    if (!r.ok) return { ok: false as const, message: r.message };
    const { items, devis: d } = r;
    if (!d.livraison) return { ok: false as const, message: "Adresse de livraison incomplète." };
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
        user_id: viewer?.id ?? null, email: a.email.trim(), items, sous_total_cents: d.sousTotal, livraison_cents: d.livraison.cents, total_cents: d.total,
        nom: a.nom.trim(), adresse1: a.adresse1.trim(), adresse2: a.adresse2?.trim() || null, cp: a.cp.trim(), ville: a.ville.trim(), pays: a.pays, tel: a.tel?.trim() || null,
        methode: d.livraison.methode, mode_test: enModeTest() || fermee, remise_cents: d.remise, code_promo: d.code,
      },
    });
    if (error || !cree?.[0]) return { ok: false as const, message: error?.message ?? "Création de la commande impossible." };
    const { id, numero } = cree[0] as { id: string; numero: string };

    // remise : un bon à usage unique, propre à cette commande
    const coupon = d.remise > 0
      ? await stripe().coupons.create({ amount_off: d.remise, currency: "eur", duration: "once", max_redemptions: 1, name: `Code ${d.code}`.slice(0, 40) })
      : null;
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
        ...(d.livraison.cents > 0 ? [{ quantity: 1, price_data: { currency: "eur", unit_amount: d.livraison.cents, product_data: { name: `Livraison : ${d.livraison.libelle}` } } }] : []),
      ],
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
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
