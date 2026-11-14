import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ChoixProduit from "@/components/shop/ChoixProduit";
import CarteProduit from "@/components/shop/CarteProduit";
import { getProduit, getProduits, produitsLies, seuilLivraisonOfferte, prixDe, CATEGORIES } from "@/lib/shop/catalogue";
import { detailsDe, guideDe } from "@/lib/shop/guides";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const p = await getProduit((await params).slug);
  return p ? { title: `${p.name} : boutique`, description: p.description ?? undefined, openGraph: { images: p.images.slice(0, 1) } } : {};
}

export default async function ProduitPage({ params }: PageProps<"/boutique/[slug]">) {
  const { slug } = await params;
  const [p, tous, seuil] = await Promise.all([getProduit(slug), getProduits(), seuilLivraisonOfferte()]);
  if (!p) notFound();
  const lies = produitsLies(p, tous);
  // fiche produit pour les moteurs de recherche
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description ?? undefined, image: p.images.slice(0, 3),
    brand: { "@type": "Brand", name: "Ambiance Rugby" },
    offers: { "@type": "Offer", priceCurrency: "EUR", price: (prixDe(p).min / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-sourdine mb-5">
        <Link href="/boutique" className="underline underline-offset-4 hover:text-encre">Boutique</Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href={`/boutique?rayon=${p.category}#catalogue`} className="underline underline-offset-4 hover:text-encre">{CATEGORIES[p.category] ?? p.category}</Link>
      </nav>
      <ChoixProduit p={p} guide={guideDe(p)} details={detailsDe(p)} seuil={seuil} />
      {lies.length > 0 && (
        <section aria-labelledby="h-lies" className="mt-16">
          <h2 id="h-lies" className="groovy text-3xl text-vin">Dans le même vestiaire</h2>
          <ul className="mt-5 grid gap-x-5 gap-y-8 grid-cols-2 lg:grid-cols-4">
            {lies.map((x) => <li key={x.id}><CarteProduit p={x} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
