"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { brancherWebhooks, produitPrintful } from "@/lib/shop/printful";
import { stripe } from "@/lib/shop/stripe";
import { commandePayee, synchroniserPrintful } from "@/lib/shop/traitement";
import { slugify } from "@/lib/format";

async function run(form: FormData, fn: () => Promise<void>) {
  try { await fn(); } catch (e) {
    unstable_rethrow(e);
    const back = String(form.get("_back") ?? "/admin/boutique");
    redirect(`${back}${back.includes("?") ? "&" : "?"}erreur=${encodeURIComponent(e instanceof Error ? e.message : "Erreur inattendue.")}`);
  }
}
async function staff() {
  const v = await getViewer();
  if (!v || v.role === "user") throw new Error("Accès réservé à la rédaction.");
  return { viewer: v, db: await createClient() };
}
const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === "string" && v.trim() ? v.trim() : null; };
const ok = (f: FormData, code = "enregistre") => { const b = String(f.get("_back") ?? "/admin/boutique"); redirect(`${b}${b.includes("?") ? "&" : "?"}ok=${code}`); };
const lire = async (id: string) => ((await shopDb().rpc("shop_lire_commande", { p_secret: null, p_id: id })).data as Commande[] | null)?.[0] ?? null;

// ---------- commandes ----------
export async function changerStatut(form: FormData) {
  return run(form, async () => {
    await staff();
    const id = String(form.get("id"));
    const statut = String(form.get("statut"));
    if (!["en_fabrication", "expediee", "livree", "annulee", "probleme"].includes(statut)) throw new Error("Statut inconnu.");
    const { error } = await shopDb().rpc("shop_maj_commande", { p_secret: null, p_id: id, p_patch: { statut, message: s(form, "message") ?? undefined } });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/boutique", "layout");
    ok(form);
  });
}

export async function rembourser(form: FormData) {
  return run(form, async () => {
    const { viewer } = await staff();
    if (viewer.role !== "admin") throw new Error("Seul un administrateur peut rembourser.");
    if (form.get("confirme") !== "on") throw new Error("Cochez la case de confirmation.");
    const c = await lire(String(form.get("id")));
    if (!c) throw new Error("Commande introuvable.");
    const { data } = await shopDb().from("shop_orders").select("stripe_payment_intent").eq("id", c.id).single();
    if (!data?.stripe_payment_intent) throw new Error("Paiement Stripe introuvable pour cette commande.");
    await stripe().refunds.create({ payment_intent: data.stripe_payment_intent });
    await shopDb().rpc("shop_maj_commande", { p_secret: null, p_id: c.id, p_patch: { statut: "remboursee", message: "Remboursement effectué." } });
    revalidatePath("/admin/boutique", "layout");
    ok(form);
  });
}

/** Relance l'envoi à Printful (après un échec) ou relit son état. */
export async function relancerPrintful(form: FormData) {
  return run(form, async () => {
    await staff();
    const c = await lire(String(form.get("id")));
    if (!c) throw new Error("Commande introuvable.");
    if (c.printful_order_id) await synchroniserPrintful(c.printful_order_id);
    else if (c.statut === "probleme" || c.statut === "payee") {
      await shopDb().rpc("shop_maj_commande", { p_secret: null, p_id: c.id, p_patch: { statut: "en_attente" } });
      await commandePayee({ ...c, statut: "en_attente" }, null);
    }
    revalidatePath("/admin/boutique", "layout");
    ok(form, "lance");
  });
}

export async function noteCommande(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("shop_orders").update({ note_interne: s(form, "note") }).eq("id", String(form.get("id")));
    if (error) throw new Error(error.message);
    ok(form);
  });
}

// ---------- produits ----------
/** Importe (ou met à jour) un produit de la boutique Printful avec toutes ses déclinaisons. */
export async function importerProduit(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const pfId = Number(form.get("printful_id"));
    const p = await produitPrintful(pfId);
    const prixMin = Math.min(...p.sync_variants.map((v) => Math.round(Number(v.retail_price) * 100)).filter((x) => x > 0));
    const { data: existant } = await db.from("shop_products").select("id").eq("printful_sync_product_id", pfId).maybeSingle();
    let productId = existant?.id as string | undefined;
    if (!productId) {
      const { data, error } = await db.from("shop_products").insert({
        slug: slugify(p.sync_product.name), name: p.sync_product.name, price_cents: Number.isFinite(prixMin) ? prixMin : 2900,
        images: [p.sync_product.thumbnail_url].filter(Boolean), printful_sync_product_id: pfId, active: false,
      }).select("id").single();
      if (error) throw new Error(error.code === "23505" ? "Un produit porte déjà ce nom : renommez-le dans Printful ou ici." : error.message);
      productId = data.id;
    }
    // déclinaisons : remplacées à chaque import
    await db.from("shop_variants").delete().eq("product_id", productId!);
    const lignes = p.sync_variants.map((v, i) => {
      const [, apres] = v.name.split(" - ");
      const morceaux = (apres ?? "").split("/").map((x) => x.trim());
      const taille = v.size ?? morceaux.find((m) => /^(XXS|XS|S|M|L|XL|\dXL|XXL|One size)$/i.test(m)) ?? null;
      const couleur = v.color ?? morceaux.find((m) => m !== taille) ?? null;
      const apercu = v.files?.find((f) => f.type === "preview")?.preview_url ?? v.product?.image ?? null;
      return {
        product_id: productId, label: [couleur, taille].filter(Boolean).join(" / ") || v.name, size: taille, color: couleur,
        price_cents: Math.round(Number(v.retail_price) * 100) || null, printful_variant_id: v.variant_id, printful_sync_variant_id: v.id, image: apercu, sort_order: i,
      };
    });
    const { error } = await db.from("shop_variants").insert(lignes);
    if (error) throw new Error(error.message);
    revalidatePath("/boutique", "layout");
    redirect(`/admin/boutique/produits/${productId}?ok=importe`);
  });
}

export async function saveProduit(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const id = String(form.get("id"));
    const prix = Number(String(form.get("prix") ?? "").replace(",", "."));
    if (!Number.isFinite(prix) || prix <= 0) throw new Error("Prix invalide.");
    const images = String(form.get("images") ?? "").split("\n").map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x));
    const { error } = await db.from("shop_products").update({
      name: s(form, "name") ?? undefined, slug: slugify(s(form, "slug") ?? s(form, "name") ?? ""), description: s(form, "description"),
      category: s(form, "category") ?? "vetements", price_cents: Math.round(prix * 100), images, sort_order: Number(form.get("sort_order") ?? 0) || 0,
      active: form.get("active") === "on", featured: form.get("featured") === "on", updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(error.code === "23505" ? "Cette adresse est déjà prise par un autre produit." : error.message);
    // prix par déclinaison (vide = prix du produit)
    for (const [k, v] of form.entries()) {
      if (!k.startsWith("v:")) continue;
      const [, vid, champ] = k.split(":");
      if (champ === "prix") { const n = Number(String(v).replace(",", ".")); await db.from("shop_variants").update({ price_cents: String(v).trim() && Number.isFinite(n) ? Math.round(n * 100) : null }).eq("id", vid); }
      if (champ === "hex") await db.from("shop_variants").update({ color_hex: /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : null }).eq("id", vid);
    }
    for (const vid of form.getAll("variantes").map(String)) await db.from("shop_variants").update({ active: form.get(`v:${vid}:active`) === "on" }).eq("id", vid);
    revalidatePath("/boutique", "layout");
    ok(form);
  });
}

// ---------- réglages ----------
export async function saveReglagesBoutique(form: FormData) {
  return run(form, async () => {
    const { viewer, db } = await staff();
    if (viewer.role !== "admin") throw new Error("Réservé aux administrateurs.");
    const { error } = await db.from("shop_settings").update({
      vendeur_nom: s(form, "vendeur_nom"), vendeur_adresse: s(form, "vendeur_adresse"), vendeur_siret: s(form, "vendeur_siret"),
      vendeur_email: s(form, "vendeur_email"), mention_tva: s(form, "mention_tva") ?? "TVA non applicable, art. 293 B du CGI", updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) throw new Error(error.message);
    ok(form);
  });
}

export async function connecterPrintful(form: FormData) {
  return run(form, async () => {
    await staff();
    const h = await headers();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
    await brancherWebhooks(`${site}/api/printful/webhook`);
    ok(form, "lance");
  });
}

/** Ouvre ou ferme la boutique. Fermée : seules les commandes d'essai de la rédaction passent, en brouillon chez Printful. */
export async function ouvrirBoutique(form: FormData) {
  return run(form, async () => {
    const { viewer, db } = await staff();
    if (viewer.role !== "admin") throw new Error("Réservé aux administrateurs.");
    const ouvrir = form.get("ouvrir") === "1";
    if (ouvrir && form.get("confirme") !== "on") throw new Error("Cochez la case pour confirmer l'ouverture.");
    const { error } = await db.from("shop_settings").update({ mode_test: !ouvrir, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    revalidatePath("/boutique", "layout");
    ok(form);
  });
}
