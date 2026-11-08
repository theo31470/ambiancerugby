/* eslint-disable @next/next/no-img-element */
import { fondPastille } from "@/lib/shop/couleurs";
import Link from "next/link";
import type { Metadata } from "next";
import { getProduits, CATEGORIES } from "@/lib/shop/catalogue";
import { euros } from "@/lib/shop/format";
import { Maillot } from "@/components/deco/Icones";

export const metadata: Metadata = { title: "Boutique", description: "T-shirts, sweats, casquettes et goodies Ambiance Rugby, fabriqués à la demande." };
export const dynamic = "force-dynamic";

export default async function Boutique() {
  const produits = await getProduits();
  const cats = Object.keys(CATEGORIES).filter((c) => produits.some((p) => p.category === c));
  return (
    <div>
      <section className="pleine-largeur bg-bordeaux text-white -mt-6 sm:-mt-10 relative overflow-hidden">
        <Maillot numero={15} className="absolute -right-6 -bottom-10 h-72 w-auto text-white/[0.07] rotate-12" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <h1 className="groovy text-5xl sm:text-7xl">La <span className="text-moutarde">boutique</span></h1>
          <p className="mt-4 max-w-xl text-white/80 text-lg">De quoi porter les couleurs d&apos;Ambiance Rugby en tribune comme à la troisième mi-temps. Chaque pièce est fabriquée à la demande, puis expédiée chez vous.</p>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            <span>Paiement sécurisé par carte</span><span>Livraison suivie</span><span>Facture à chaque commande</span>
          </p>
        </div>
      </section>

      {!produits.length ? (
        <div className="mt-12 bg-surface border border-dashed border-trait rounded-2xl p-10 text-center max-w-xl mx-auto">
          <Maillot className="h-20 w-auto mx-auto text-vin" />
          <p className="mt-4 titre font-bold text-xl">La collection arrive bientôt</p>
          <p className="mt-1 text-sourdine">On met la dernière main aux maillots. Revenez très vite.</p>
        </div>
      ) : cats.map((c) => (
        <section key={c} aria-labelledby={`cat-${c}`} className="mt-12">
          <h2 id={`cat-${c}`} className="groovy text-3xl text-vin mb-5">{CATEGORIES[c]}</h2>
          <ul className="grid gap-6 grid-cols-2 lg:grid-cols-4">
            {produits.filter((p) => p.category === c).map((p) => {
              const couleurs = [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, v.color_hex])).entries()];
              return (
                <li key={p.id}>
                  <Link href={`/boutique/${p.slug}`} className="group block">
                    <div className="relative aspect-square rounded-2xl bg-teinte overflow-hidden carte-vie">
                      {p.images[0] && <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                      {p.images[1] && <img src={p.images[1]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />}
                      {p.featured && <span className="absolute top-3 left-3 text-xs font-bold rounded-full bg-moutarde text-bordeaux px-2.5 py-1">Nouveau</span>}
                    </div>
                    <p className="mt-3 font-semibold leading-tight group-hover:underline underline-offset-4">{p.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="titre font-extrabold text-lg">{euros(p.price_cents)}</span>
                      {couleurs.length > 1 && (
                        <span className="flex -space-x-1" aria-label={`${couleurs.length} couleurs`}>
                          {couleurs.slice(0, 5).map(([nom, hex]) => <span key={nom} title={nom} className="w-4 h-4 rounded-full border-2 border-fond" style={{ background: fondPastille(hex) }} />)}
                          {couleurs.length > 5 && <span className="pl-2 text-xs font-semibold text-sourdine tnum">+{couleurs.length - 5}</span>}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
