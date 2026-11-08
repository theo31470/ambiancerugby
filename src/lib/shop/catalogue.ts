import { publicClient } from "@/lib/supabase/server";

export type Variante = { id: string; label: string; size: string | null; color: string | null; color_hex: string | null; price_cents: number | null; image: string | null; active: boolean; sort_order: number };
export type Produit = {
  id: string; slug: string; name: string; description: string | null; category: string; images: string[]; price_cents: number;
  featured: boolean; variants: Variante[];
};
export const CATEGORIES: Record<string, string> = { vetements: "Vêtements", accessoires: "Accessoires", maison: "Maison", goodies: "Goodies" };

export async function getProduits(): Promise<Produit[]> {
  const { data } = await publicClient().from("shop_products")
    .select("id,slug,name,description,category,images,price_cents,featured, variants:shop_variants(id,label,size,color,color_hex,price_cents,image,active,sort_order)")
    .eq("active", true).order("sort_order").order("created_at");
  return ((data ?? []) as Produit[]).map((p) => ({ ...p, variants: p.variants.filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order) }));
}
export async function getProduit(slug: string): Promise<Produit | null> {
  const { data } = await publicClient().from("shop_products")
    .select("id,slug,name,description,category,images,price_cents,featured, variants:shop_variants(id,label,size,color,color_hex,price_cents,image,active,sort_order)")
    .eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) return null;
  const p = data as Produit;
  return { ...p, variants: p.variants.filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order) };
}
