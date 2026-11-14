import { publicClient } from "@/lib/supabase/server";

export type Variante = { id: string; label: string; size: string | null; color: string | null; color_hex: string | null; price_cents: number | null; image: string | null; active: boolean; sort_order: number };
export type Produit = {
  id: string; slug: string; name: string; description: string | null; category: string; images: string[]; price_cents: number;
  featured: boolean; variants: Variante[]; details: string | null; guide_tailles: string | null; created_at: string;
};
export const CATEGORIES: Record<string, string> = { vetements: "Vêtements", accessoires: "Accessoires", maison: "Maison", goodies: "Goodies" };
/** Phrase d'accroche de chaque rayon (page d'accueil de la boutique). */
export const ACCROCHES: Record<string, string> = {
  vetements: "T-shirts, sweats et casquettes pour la tribune",
  accessoires: "Le petit plus du jour de match",
  maison: "Posters des villes de rugby, mugs et déco",
  goodies: "Tapis de souris, autocollants et cadeaux",
};

const CHAMPS = "id,slug,name,description,category,images,price_cents,featured,details,guide_tailles,created_at, variants:shop_variants(id,label,size,color,color_hex,price_cents,image,active,sort_order)";

/** Variantes actives triées ; sans visuel produit (maquette Printful pas encore prête à l'import), on prend ceux des variantes. */
function preparer(p: Produit): Produit {
  const variants = p.variants.filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order);
  const images = p.images?.length ? p.images : [...new Set(variants.map((v) => v.image).filter((x): x is string => !!x))].slice(0, 2);
  return { ...p, images, variants };
}

export async function getProduits(): Promise<Produit[]> {
  const { data } = await publicClient().from("shop_products").select(CHAMPS)
    .eq("active", true).order("sort_order").order("created_at");
  return ((data ?? []) as Produit[]).map(preparer);
}
export async function getProduit(slug: string): Promise<Produit | null> {
  const { data } = await publicClient().from("shop_products").select(CHAMPS).eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) return null;
  return preparer(data as Produit);
}

/** Seuil de livraison offerte (null : jamais offerte). */
export async function seuilLivraisonOfferte(): Promise<number | null> {
  const { data } = await publicClient().from("shop_settings").select("livraison_offerte_cents").eq("id", 1).maybeSingle();
  const v = data?.livraison_offerte_cents;
  return typeof v === "number" && v > 0 ? v : null;
}

/** Prix « à partir de » quand les déclinaisons n'ont pas toutes le même prix. */
export function prixDe(p: Produit) {
  const prix = p.variants.map((v) => v.price_cents ?? p.price_cents);
  const min = prix.length ? Math.min(...prix) : p.price_cents;
  return { min, varie: prix.some((x) => x !== min) };
}

/** Couleurs distinctes d'un produit, dans l'ordre des déclinaisons. */
export const couleursDe = (p: Produit) => [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, v.color_hex])).entries()];

/** Produits à proposer sous une fiche : même rayon d'abord, puis les nouveautés, puis le reste. */
export function produitsLies(p: Produit, tous: Produit[], n = 4) {
  const autres = tous.filter((x) => x.id !== p.id);
  return [...autres.filter((x) => x.category === p.category), ...autres.filter((x) => x.featured), ...autres]
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i).slice(0, n);
}
