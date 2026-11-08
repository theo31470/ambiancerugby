/** Client Printful (API v1). La clé reste côté serveur. */
const BASE = "https://api.printful.com";

async function pf<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const cle = process.env.PRINTFUL_API_KEY;
  if (!cle) throw new Error("La clé PRINTFUL_API_KEY n'est pas encore configurée sur Vercel.");
  const res = await fetch(BASE + chemin, {
    ...init,
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json", ...(process.env.PRINTFUL_STORE_ID ? { "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID } : {}), ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Printful : ${body?.error?.message ?? body?.result ?? `HTTP ${res.status}`}`);
  return body.result as T;
}

export type Destinataire = { name: string; address1: string; address2?: string | null; city: string; country_code: string; zip: string; phone?: string | null; email?: string };
export type Tarif = { id: string; name: string; rate: string; currency: string; minDeliveryDays?: number; maxDeliveryDays?: number };

/** Tarifs de livraison pour un panier (le moins cher en premier). */
export async function tarifsLivraison(dest: Pick<Destinataire, "country_code" | "zip" | "city">, items: { sync_variant_id: number; quantity: number }[]) {
  const tarifs = await pf<Tarif[]>("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient: dest, items: items.map((i) => ({ sync_variant_id: i.sync_variant_id, quantity: i.quantity })), currency: "EUR", locale: "fr_FR" }),
  });
  return [...tarifs].sort((a, b) => Number(a.rate) - Number(b.rate));
}

export type CommandePrintful = { id: number; external_id: string | null; status: string; shipments?: { carrier: string; service: string; tracking_number: string; tracking_url: string; ship_date?: string }[] };

/** Crée la commande chez Printful. En mode test, elle reste en brouillon (aucun débit, rien n'est fabriqué). */
export async function creerCommandePrintful(o: { numero: string; destinataire: Destinataire; items: { sync_variant_id: number; quantity: number; retail_price: string }[]; livraison: string; confirmer: boolean }) {
  return pf<CommandePrintful>(`/orders?confirm=${o.confirmer ? "true" : "false"}`, {
    method: "POST",
    body: JSON.stringify({ external_id: o.numero, shipping: o.livraison, recipient: o.destinataire, items: o.items }),
  });
}

export const lireCommandePrintful = (id: number) => pf<CommandePrintful>(`/orders/${id}`);

/** Produits de la boutique Printful (pour l'import dans l'admin). */
export const produitsPrintful = () => pf<{ id: number; name: string; thumbnail_url: string; variants: number }[]>("/store/products?limit=100");
export const produitPrintful = (id: number) => pf<{
  sync_product: { id: number; name: string; thumbnail_url: string };
  sync_variants: { id: number; name: string; variant_id: number; retail_price: string; size?: string; color?: string; files?: { type: string; preview_url: string }[]; product?: { image: string } }[];
}>(`/store/products/${id}`);

/** Abonne la boutique aux événements Printful (expédition, échec…). */
export const brancherWebhooks = (url: string) =>
  pf("/webhooks", { method: "POST", body: JSON.stringify({ url, types: ["package_shipped", "package_returned", "order_failed", "order_canceled", "order_put_hold", "order_remove_hold", "order_updated"] }) });

// ---------- catalogue Printful (modèles vierges) et création de produits ----------
export type ModeleCatalogue = { id: number; type: string; type_name: string; title: string; brand: string | null; model: string };
export type VarianteCatalogue = { id: number; color: string | null; color_code: string | null; size: string | null; name: string; in_stock?: boolean };
export const catalogue = () => pf<ModeleCatalogue[]>("/products");
export const modeleCatalogue = (id: number) => pf<{ product: ModeleCatalogue; variants: VarianteCatalogue[] }>(`/products/${id}`);

/** Crée un produit dans la boutique Printful avec ses déclinaisons et le visuel à imprimer. */
export const creerProduitPrintful = (p: { nom: string; vignette: string; variantes: { variant_id: number; prix: string; fichiers: { type: string; url: string }[] }[] }) =>
  pf<{ id: number }>("/store/products", {
    method: "POST",
    body: JSON.stringify({
      sync_product: { name: p.nom, thumbnail: p.vignette },
      sync_variants: p.variantes.map((v) => ({ variant_id: v.variant_id, retail_price: v.prix, files: v.fichiers })),
    }),
  });
