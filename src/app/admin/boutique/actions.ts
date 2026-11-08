"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { brancherWebhooks, catalogue, creerProduitPrintful, majDeclinaisonsPrintful, modeleCatalogue, produitPrintful, type VarianteBoutique, type VarianteCatalogue } from "@/lib/shop/printful";
import { estClair, luminance, rangTaille } from "@/lib/shop/couleurs";
import { COLLECTION, visuelPour } from "@/lib/shop/collection";
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
type Db = Awaited<ReturnType<typeof createClient>>;
const RE_TAILLE = /^(XXS|XS|S|M|L|XL|\dXL|XXL|One size|\d+ ?oz|\d.*[×x].*)$/i;

/** Variantes du catalogue Printful (couleur, code couleur, taille) des modèles utilisés par un produit. */
async function variantesCatalogue(modeles: number[]) {
  const cat = new Map<number, VarianteCatalogue>();
  for (const m of [...new Set(modeles)].filter(Boolean)) {
    const { variants } = await modeleCatalogue(m);
    for (const v of variants) cat.set(v.id, { ...v, product_id: v.product_id ?? m });
  }
  return cat;
}
const hexDe = (c?: VarianteCatalogue) => (c?.color_code ? [c.color_code, c.color_code2].filter((x): x is string => !!x && /^#[0-9a-f]{6}$/i.test(x)).join(",") || null : null);

/**
 * Copie un produit de la boutique Printful sur le site, avec toutes ses déclinaisons.
 * Couleur, code couleur et taille viennent du catalogue Printful ; les déclinaisons déjà présentes gardent
 * leur identifiant (paniers en cours), leur prix et leur état « en vente ».
 */
async function importer(db: Db, pfId: number, extra: { description?: string; category?: string; price_cents?: number } = {}) {
  const p = await produitPrintful(pfId);
  const cat = await variantesCatalogue(p.sync_variants.map((v) => v.product?.product_id ?? 0));
  const prixMin = Math.min(...p.sync_variants.map((v) => Math.round(Number(v.retail_price) * 100)).filter((x) => x > 0));
  const { data: existant } = await db.from("shop_products").select("id").eq("printful_sync_product_id", pfId).maybeSingle();
  let productId = existant?.id as string | undefined;
  if (!productId) {
    const { data, error } = await db.from("shop_products").insert({
      slug: slugify(p.sync_product.name), name: p.sync_product.name, price_cents: extra.price_cents ?? (Number.isFinite(prixMin) ? prixMin : 2900),
      description: extra.description ?? null, category: extra.category ?? "vetements",
      images: [p.sync_product.thumbnail_url].filter(Boolean), printful_sync_product_id: pfId, active: false,
    }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? `Un produit s'appelle déjà « ${p.sync_product.name} » : renommez-le.` : error.message);
    productId = data.id;
  }
  const { data: avant } = await db.from("shop_variants").select("id, printful_sync_variant_id, price_cents, active").eq("product_id", productId!);
  const parSync = new Map((avant ?? []).map((x) => [Number(x.printful_sync_variant_id), x]));

  const lignes = p.sync_variants.map((v) => {
    const c = cat.get(v.variant_id);
    const [, apres] = v.name.split(" - ");
    const morceaux = (apres ?? "").split("/").map((x) => x.trim()).filter(Boolean);
    const taille = c?.size ?? v.size ?? morceaux.find((m) => RE_TAILLE.test(m)) ?? null;
    const couleur = c?.color ?? v.color ?? (morceaux.filter((m) => m !== taille).join("/") || null);
    const apercu = v.files?.find((f) => f.type === "preview")?.preview_url ?? v.product?.image ?? c?.image ?? null;
    return {
      v, couleur, taille, hex: hexDe(c), apercu,
      label: [couleur, taille && !/^one size$/i.test(taille) ? taille : null].filter(Boolean).join(" / ") || v.name,
    };
  });
  // ordre d'affichage : couleurs dans l'ordre du catalogue, puis tailles de la plus petite à la plus grande
  const ordreCouleurs = [...new Set([...cat.values()].map((c) => c.color))];
  lignes.sort((x, y) => (ordreCouleurs.indexOf(x.couleur) - ordreCouleurs.indexOf(y.couleur)) || (rangTaille(x.taille) - rangTaille(y.taille)));

  const commun = (l: (typeof lignes)[number], i: number) => ({
    product_id: productId!, label: l.label, size: l.taille, color: l.couleur, color_hex: l.hex,
    printful_variant_id: l.v.variant_id, printful_sync_variant_id: l.v.id, image: l.apercu, sort_order: i,
  });
  const maj = lignes.flatMap((l, i) => { const a = parSync.get(l.v.id); return a ? [{ id: a.id, ...commun(l, i), price_cents: a.price_cents, active: a.active }] : []; });
  const nouvelles = lignes.flatMap((l, i) => parSync.has(l.v.id) ? [] : [{ ...commun(l, i), price_cents: Math.round(Number(l.v.retail_price) * 100) || null }]);
  const disparues = (avant ?? []).filter((a) => !p.sync_variants.some((v) => v.id === Number(a.printful_sync_variant_id))).map((a) => a.id);

  for (let i = 0; i < maj.length; i += 200) { const { error } = await db.from("shop_variants").upsert(maj.slice(i, i + 200), { onConflict: "id" }); if (error) throw new Error(error.message); }
  for (let i = 0; i < nouvelles.length; i += 200) { const { error } = await db.from("shop_variants").insert(nouvelles.slice(i, i + 200)); if (error) throw new Error(error.message); }
  for (let i = 0; i < disparues.length; i += 100) await db.from("shop_variants").delete().in("id", disparues.slice(i, i + 100));
  return { productId: productId!, total: lignes.length, ajoutees: nouvelles.length };
}

/**
 * Ajoute dans Printful toutes les couleurs et tailles disponibles du modèle qui manquent au produit.
 * Le visuel de chaque nouvelle déclinaison est copié depuis la même couleur si elle existe déjà,
 * sinon depuis la couleur de teinte la plus proche (visuel clair sur vêtement foncé, et inversement).
 */
async function completerDeclinaisons(pfId: number) {
  const p = await produitPrintful(pfId);
  if (!p.sync_variants.length) throw new Error("ce produit n'a aucune déclinaison dans Printful");
  const modeles = [...new Set(p.sync_variants.map((v) => v.product?.product_id ?? 0))].filter(Boolean);
  if (modeles.length !== 1) throw new Error("produit composé de plusieurs modèles : ajoutez les couleurs dans Printful");
  const cat = await variantesCatalogue(modeles);
  const deja = new Set(p.sync_variants.map((v) => v.variant_id));
  const manquantes = [...cat.values()].filter((c) => !deja.has(c.id) && c.in_stock !== false);
  if (!manquantes.length) return 0;

  const sources = p.sync_variants.map((v) => ({ v, c: cat.get(v.variant_id) }));
  // même fichier et même placement que la déclinaison copiée
  const fichiers = (v: VarianteBoutique) => (v.files ?? []).filter((f) => f.type !== "preview" && (f.url || f.id))
    .map((f) => ({ type: f.type, ...(f.url ? { url: f.url } : { id: f.id }), ...(f.position ? { position: f.position } : {}), ...(Array.isArray(f.options) && f.options.length ? { options: f.options } : {}) }));
  const options = (v: VarianteBoutique) => (v.options ?? []).filter((o) => o.value !== null && o.value !== "" && !(Array.isArray(o.value) && !o.value.length)).map((o) => ({ id: o.id, value: o.value }));
  // les déclinaisons existantes sont désignées par leur seul id : Printful les garde telles quelles
  const garder = p.sync_variants.map((v) => ({ id: v.id }));
  const ajouts = manquantes.map((m) => {
    const memeCouleur = sources.filter((s) => s.c?.color === m.color);
    const choix = (memeCouleur.length ? memeCouleur : sources).slice().sort((a, b) =>
      (memeCouleur.length ? Math.abs(rangTaille(a.c?.size ?? null) - rangTaille(m.size)) - Math.abs(rangTaille(b.c?.size ?? null) - rangTaille(m.size)) : 0)
      || (Math.abs(luminance(a.c?.color_code) - luminance(m.color_code)) - Math.abs(luminance(b.c?.color_code) - luminance(m.color_code)))
      || (estClair(a.c?.color_code) === estClair(m.color_code) ? -1 : 1))[0].v;
    return { variant_id: m.id, retail_price: choix.retail_price, files: fichiers(choix), options: options(choix) };
  });
  await majDeclinaisonsPrintful(pfId, [...garder, ...ajouts]);
  return ajouts.length;
}

/** Importe (ou met à jour) un produit de la boutique Printful avec toutes ses déclinaisons. */
export async function importerProduit(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { productId } = await importer(db, Number(form.get("printful_id")));
    revalidatePath("/boutique", "layout");
    redirect(`/admin/boutique/produits/${productId}?ok=importe`);
  });
}

/** Remet à jour tous les produits du site depuis Printful (couleurs, tailles, photos). */
export async function toutMettreAJour(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { data } = await db.from("shop_products").select("name, printful_sync_product_id").not("printful_sync_product_id", "is", null);
    const bilan: string[] = [];
    for (const x of data ?? []) {
      try { const r = await importer(db, Number(x.printful_sync_product_id)); bilan.push(`${x.name} : ${r.total} déclinaisons`); }
      catch (e) { bilan.push(`${x.name} : ${(e as Error).message}`); }
    }
    revalidatePath("/boutique", "layout");
    const echec = bilan.some((b) => !/déclinaisons$/.test(b));
    const back = String(form.get("_back") ?? "/admin/boutique/produits");
    redirect(`${back}?${echec ? `erreur=${encodeURIComponent(bilan.join(" · "))}` : "ok=enregistre"}`);
  });
}

/** Ajoute à un produit (ou à tous) toutes les couleurs et tailles du modèle Printful, puis réimporte. */
export async function ajouterToutesCouleurs(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const id = s(form, "id");
    let req = db.from("shop_products").select("id, name, printful_sync_product_id").not("printful_sync_product_id", "is", null);
    if (id) req = req.eq("id", id);
    const { data } = await req;
    const bilan: string[] = [];
    for (const x of data ?? []) {
      try {
        const n = await completerDeclinaisons(Number(x.printful_sync_product_id));
        const r = await importer(db, Number(x.printful_sync_product_id));
        bilan.push(`${x.name} : ${n ? `${n} ajoutées, ` : ""}${r.total} déclinaisons`);
      } catch (e) { bilan.push(`${x.name} : ${(e as Error).message}`); }
    }
    revalidatePath("/boutique", "layout");
    const echec = bilan.some((b) => !/déclinaisons$/.test(b));
    const back = String(form.get("_back") ?? "/admin/boutique/produits");
    redirect(`${back}?${echec ? `erreur=${encodeURIComponent(bilan.join(" · "))}` : `ok=couleurs&bilan=${encodeURIComponent(bilan.join(" · "))}`}`);
  });
}

/** Crée la collection dans Printful (visuels du dossier /merch), toutes couleurs et tailles, puis l'importe, masquée. */
export async function creerCollection(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const h = await headers();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
    const modeles = await catalogue();
    const { data: deja } = await db.from("shop_products").select("name");
    const existants = new Set((deja ?? []).map((x) => x.name));
    const bilan: string[] = [];
    for (const a of COLLECTION) {
      if (existants.has(a.nom)) { bilan.push(`${a.nom} : déjà là`); continue; }
      try {
        const modele = modeles.find((m) => a.modele.test(m.title) || a.modele.test(`${m.brand ?? ""} ${m.model}`));
        if (!modele) throw new Error("modèle introuvable dans le catalogue Printful");
        const { variants } = await modeleCatalogue(modele.id);
        const tailleOk = (v: VarianteCatalogue) => !a.tailles || a.tailles.some((t) => (v.size ?? "").replace(/\s/g, "").toLowerCase() === t.replace(/\s/g, "").toLowerCase());
        const choisies = variants.filter((v) => tailleOk(v) && v.in_stock !== false);
        if (!choisies.length) throw new Error("aucune couleur ou taille disponible");
        const cree = await creerProduitPrintful({
          nom: a.nom, vignette: `${site}/merch/${visuelPour(a, choisies[0].color_code)}.png`,
          variantes: choisies.map((v) => ({ variant_id: v.id, prix: a.prix, fichiers: [{ type: a.emplacement, url: `${site}/merch/${visuelPour(a, v.color_code)}.png` }] })),
        });
        await importer(db, cree.id, { description: a.description, category: a.categorie, price_cents: Math.round(Number(a.prix) * 100) });
        bilan.push(`${a.nom} : créé (${choisies.length} déclinaisons)`);
      } catch (e) {
        bilan.push(`${a.nom} : ${(e as Error).message}`);
      }
    }
    revalidatePath("/boutique", "layout");
    const echecs = bilan.filter((b) => !/créé|déjà là/.test(b));
    const back = String(form.get("_back") ?? "/admin/boutique/produits");
    redirect(`${back}?${echecs.length ? `erreur=${encodeURIComponent(bilan.join(" · "))}` : "ok=collection"}`);
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
      // la pastille n'est réécrite que si elle a été changée à la main (sinon on garde la couleur Printful)
      if (champ === "hex" && String(v) !== String(form.get(`v:${vid}:hex0`) ?? "") && /^#[0-9a-f]{6}$/i.test(String(v))) await db.from("shop_variants").update({ color_hex: String(v) }).eq("id", vid);
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
