/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { Field, Select, Area } from "@/components/admin/Field";
import { CATEGORIES } from "@/lib/shop/catalogue";
import { ajouterToutesCouleurs, importerProduit, saveProduit } from "../../actions";
import { fondPastille, teintes } from "@/lib/shop/couleurs";

export const maxDuration = 300;

type V = { id: string; label: string; color: string | null; color_hex: string | null; price_cents: number | null; image: string | null; active: boolean; sort_order: number };

export default async function EditProduit({ params, searchParams }: PageProps<"/admin/boutique/produits/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const { data: p } = await db.from("shop_products").select("*, variants:shop_variants(id,label,color,color_hex,price_cents,image,active,sort_order)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const variantes = ((p.variants ?? []) as V[]).sort((a, b) => a.sort_order - b.sort_order);
  const back = `/admin/boutique/produits/${id}`;
  return (
    <div>
      <Link href="/admin/boutique/produits" className="text-sm text-sourdine underline underline-offset-4">Tous les produits</Link>
      <div className="mt-2">
        <PageHeader titre={p.name} description={p.active ? "En vente sur le site." : "Masqué : cochez « En vente » pour le publier."}
          actions={<>
            {p.printful_sync_product_id && <>
              <form action={importerProduit}><input type="hidden" name="printful_id" value={p.printful_sync_product_id} /><input type="hidden" name="_back" value={back} /><button className="bouton-discret">Mettre à jour depuis Printful</button></form>
              <form action={ajouterToutesCouleurs}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="_back" value={back} /><button className="bouton-discret">Ajouter toutes les couleurs et tailles</button></form>
            </>}
            {p.active && <Link href={`/boutique/${p.slug}`} className="bouton-discret">Voir sur le site</Link>}
          </>} />
      </div>
      <Notice sp={sp} />
      <form action={saveProduit} className="grid gap-6">
        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="_back" value={back} />
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
          <Field name="name" label="Nom" defaultValue={p.name} required />
          <Field name="slug" label="Adresse de la page" defaultValue={p.slug} />
          <Field name="prix" label="Prix de vente (€)" defaultValue={(p.price_cents / 100).toFixed(2).replace(".", ",")} required hint="Prix affiché par défaut ; une déclinaison peut avoir le sien." />
          <Select name="category" label="Catégorie" defaultValue={p.category} options={Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))} />
          <Field name="sort_order" label="Ordre d'affichage" type="number" defaultValue={p.sort_order} />
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} /> En vente</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Nouveauté</label>
          </div>
        </div>
        <Area name="description" label="Description" rows={4} defaultValue={p.description} className="max-w-3xl" />
        <Area name="images" label="Photos (une adresse par ligne, la première est la principale)" rows={4} defaultValue={(p.images ?? []).join("\n")} className="max-w-3xl" />
        <section>
          <h2 className="font-bold text-lg mb-1">Déclinaisons <span className="font-normal text-sourdine text-base tnum">({variantes.length})</span></h2>
          <p className="text-sm text-sourdine mb-3 max-w-prose">Décochez une déclinaison pour ne plus la vendre. « Ajouter toutes les couleurs et tailles » crée dans Printful celles du modèle qui manquent, avec le même visuel (version claire ou foncée selon la teinte).</p>
          <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
                <th className="font-semibold px-3 py-2">En vente</th><th className="font-semibold px-3">Déclinaison</th><th className="font-semibold px-3">Couleur affichée</th><th className="font-semibold px-3">Prix (€)</th>
              </tr></thead>
              <tbody>
                {variantes.map((v) => (
                  <tr key={v.id} className="border-b border-trait last:border-0">
                    <td className="px-3 py-1.5"><input type="hidden" name="variantes" value={v.id} /><input type="checkbox" name={`v:${v.id}:active`} defaultChecked={v.active} aria-label={`${v.label} en vente`} /></td>
                    <td className="px-3"><span className="flex items-center gap-2">{v.image && <img src={v.image} alt="" className="w-8 h-8 rounded object-cover" />}{v.label}</span></td>
                    <td className="px-3">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="w-6 h-6 rounded-full border border-trait" style={{ background: fondPastille(v.color_hex) }} />
                        <input type="hidden" name={`v:${v.id}:hex0`} value={teintes(v.color_hex)[0] ?? "#cfc6bd"} />
                        <input type="color" name={`v:${v.id}:hex`} defaultValue={teintes(v.color_hex)[0] ?? "#cfc6bd"} aria-label={`Corriger la couleur de ${v.label}`} title="Corriger la couleur (rarement utile : elle vient de Printful)" className="h-8 w-10 rounded border border-trait opacity-60 hover:opacity-100" />
                      </span>
                    </td>
                    <td className="px-3"><input name={`v:${v.id}:prix`} defaultValue={v.price_cents != null ? (v.price_cents / 100).toFixed(2).replace(".", ",") : ""} placeholder="prix du produit" aria-label={`Prix de ${v.label}`} className="champ !py-1 w-28" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div><button className="bouton">Enregistrer</button></div>
      </form>
    </div>
  );
}
