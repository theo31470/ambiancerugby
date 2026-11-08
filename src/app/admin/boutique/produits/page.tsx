/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { produitsPrintful } from "@/lib/shop/printful";
import { euros } from "@/lib/shop/format";
import { creerCollection, importerProduit } from "../actions";

export default async function AdminProduits({ searchParams }: PageProps<"/admin/boutique/produits">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("shop_products").select("id,name,slug,price_cents,images,active,featured,printful_sync_product_id, variants:shop_variants(id)").order("sort_order").order("created_at");
  let pf: Awaited<ReturnType<typeof produitsPrintful>> = [];
  let erreurPf: string | null = null;
  try { pf = await produitsPrintful(); } catch (e) { erreurPf = (e as Error).message; }
  const importes = new Set((data ?? []).map((p) => p.printful_sync_product_id));

  return (
    <div>
      <Link href="/admin/boutique" className="text-sm text-sourdine underline underline-offset-4">Commandes</Link>
      <div className="mt-2">
        <PageHeader titre="Produits" description="Créez vos produits dans Printful (visuel, modèle, prix de vente), importez-les ici, puis mettez-les en vente."
          aide={<>
            <p>1. Dans Printful, créez le produit dans votre boutique API : choisissez le modèle, posez le visuel, fixez le prix de vente.</p>
            <p>2. Cliquez sur « Importer » ci-dessous : tailles, couleurs et photos arrivent toutes seules.</p>
            <p>3. Vérifiez la fiche (description, catégorie, prix), cochez « En vente » et enregistrez.</p>
          </>} />
      </div>
      <Notice sp={sp} />

      <section aria-labelledby="h-collection" className="mb-10 rounded-2xl bg-bordeaux text-white p-5 grid gap-5 lg:grid-cols-[1fr_20rem] items-center">
        <div>
          <h2 id="h-collection" className="titre font-extrabold text-xl">Première collection Ambiance Rugby</h2>
          <p className="mt-1 text-sm text-white/80 max-w-prose">
            Visuels originaux créés à partir du logo : t-shirt logo, t-shirt « Troisième mi-temps », sweat « Allez les gars », mug et autocollant.
            Un clic les crée dans votre boutique Printful avec leurs couleurs, tailles et prix, puis les importe ici, masqués, pour que vous les vérifiiez.
          </p>
          <form action={creerCollection} className="mt-4">
            <input type="hidden" name="_back" value="/admin/boutique/produits" />
            <button className="bouton-or">Créer la collection dans Printful</button>
          </form>
          <p className="mt-2 text-xs text-white/60">Fichiers d&apos;impression : <a href="/merch/apercu-collection.jpg" className="underline">voir la planche</a>. Les produits déjà créés sont ignorés.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/merch/apercu-collection.jpg" alt="Les visuels de la collection" className="rounded-xl w-full" />
      </section>

      <h2 className="font-bold text-lg mb-3">Sur le site</h2>
      {(data ?? []).length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-10">
          {(data ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/admin/boutique/produits/${p.id}`} className="flex gap-3 bg-surface border border-trait rounded-2xl p-3 hover:border-vin">
                <span className="w-16 h-16 rounded-xl bg-teinte overflow-hidden shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</span>
                <span className="min-w-0">
                  <span className="font-semibold block truncate">{p.name}</span>
                  <span className="text-sm text-sourdine">{euros(p.price_cents)}, {(p.variants as unknown[]).length} déclinaisons</span>
                  <span className="block mt-1">{p.active ? <span className="text-xs font-bold rounded-full bg-ok/15 text-ok px-2 py-0.5">En vente</span> : <span className="text-xs font-bold rounded-full bg-teinte text-sourdine px-2 py-0.5">Masqué</span>}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-sourdine mb-10">Aucun produit pour l&apos;instant.</p>}

      <h2 className="font-bold text-lg mb-3">Dans votre boutique Printful</h2>
      {erreurPf ? <p className="rounded-xl bg-alerte/10 text-alerte px-4 py-3 text-sm">{erreurPf}</p> : pf.length ? (
        <ul className="grid gap-2">
          {pf.map((x) => (
            <li key={x.id} className="flex items-center gap-3 bg-surface border border-trait rounded-xl p-2.5">
              <img src={x.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-teinte" />
              <span className="flex-1 font-semibold">{x.name} <span className="font-normal text-sm text-sourdine">({x.variants} déclinaisons)</span></span>
              <form action={importerProduit}>
                <input type="hidden" name="printful_id" value={x.id} /><input type="hidden" name="_back" value="/admin/boutique/produits" />
                <button className="bouton-discret">{importes.has(x.id) ? "Mettre à jour" : "Importer"}</button>
              </form>
            </li>
          ))}
        </ul>
      ) : <p className="text-sourdine">Aucun produit dans Printful pour l&apos;instant.</p>}
    </div>
  );
}
