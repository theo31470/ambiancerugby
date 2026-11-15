/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getProduits, seuilLivraisonOfferte, prixDe, CATEGORIES, ACCROCHES, type Produit } from "@/lib/shop/catalogue";
import { euros } from "@/lib/shop/format";
import CarteProduit from "@/components/shop/CarteProduit";
import { Maillot } from "@/components/deco/Icones";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Le vestiaire Ambiance Rugby : t-shirts, sweats, casquettes, posters des villes de rugby et goodies, fabriqués à la demande.",
};
export const dynamic = "force-dynamic";

const TRIS = { nouveautes: "Nouveautés", "prix-croissant": "Prix croissant", "prix-decroissant": "Prix décroissant" } as const;
type Tri = keyof typeof TRIS;

function trier(liste: Produit[], tri: Tri) {
  const l = [...liste];
  if (tri === "prix-croissant") return l.sort((a, b) => prixDe(a).min - prixDe(b).min);
  if (tri === "prix-decroissant") return l.sort((a, b) => prixDe(b).min - prixDe(a).min);
  // nouveautés : les articles mis en avant, puis les plus récents
  return l.sort((a, b) => Number(b.featured) - Number(a.featured) || b.created_at.localeCompare(a.created_at));
}

export default async function Boutique({ searchParams }: PageProps<"/boutique">) {
  const sp = await searchParams;
  const [produits, seuil] = await Promise.all([getProduits(), seuilLivraisonOfferte()]);
  const rayons = Object.keys(CATEGORIES).filter((c) => produits.some((p) => p.category === c));
  const rayon = typeof sp.rayon === "string" && rayons.includes(sp.rayon) ? sp.rayon : null;
  const tri: Tri = typeof sp.tri === "string" && sp.tri in TRIS ? (sp.tri as Tri) : "nouveautes";
  const liste = trier(produits.filter((p) => !rayon || p.category === rayon), tri);
  // vitrine variée : la dernière nouveauté de chaque rayon (vêtements d'abord)
  const recents = trier(produits, "nouveautes").filter((p) => p.images[0]);
  const vitrine = ["vetements", "maison", "goodies", "accessoires"].map((c) => recents.find((p) => p.category === c)).filter((p): p is Produit => !!p)
    .concat(recents).filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
  const lien = (r: string | null, t: Tri) => {
    const q = new URLSearchParams();
    if (r) q.set("rayon", r);
    if (t !== "nouveautes") q.set("tri", t);
    return `/boutique${q.size ? `?${q}` : ""}#catalogue`;
  };

  const garanties: [string, string, string | null][] = [
    ["Fabriqué pour vous", "Imprimé à la demande, sans stock ni gaspillage", null],
    ["Livraison suivie", seuil ? `Offerte dès ${euros(seuil)} d'achat` : "Suivez votre colis à chaque étape", "/suivi"],
    ["14 jours pour changer d'avis", "Retour simple depuis votre commande", "/boutique/aide#retours"],
    ["Paiement sécurisé", "Carte, Apple Pay et Google Pay", null],
  ];

  return (
    <div>
      {/* l'entrée du vestiaire */}
      <section className="pleine-largeur bg-bordeaux text-white -mt-6 sm:-mt-10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center relative">
          <div>
            <h1 className="groovy text-6xl sm:text-8xl leading-[.9]">Le <span className="text-moutarde">vestiaire</span></h1>
            <p className="mt-5 max-w-md text-lg text-white/85">De quoi porter les couleurs d&apos;Ambiance Rugby en tribune comme à la troisième mi-temps, et afficher sa ville de rugby à la maison.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#catalogue" className="bouton-or text-lg">Voir la collection</Link>
              {produits.some((p) => /poster/i.test(p.name)) && <Link href={lien("maison", "nouveautes")} className="inline-flex items-center rounded-full border-2 border-white/30 px-5 py-2 font-semibold hover:border-white">Les posters des villes</Link>}
            </div>
          </div>
          {vitrine.length > 0 && (
            <ul aria-label="À la une" className="relative h-72 sm:h-96 vitrine-entree">
              {vitrine.map((p, i) => (
                <li key={p.id} className="absolute w-[46%] sm:w-[44%]" style={{ left: `${[0, 30, 56][i]}%`, top: `${[14, 0, 20][i]}%`, rotate: `${[-5, 2, 6][i]}deg`, zIndex: [1, 3, 2][i], ["--i" as string]: i }}>
                  <Link href={`/boutique/${p.slug}`} className="block rounded-2xl overflow-hidden bg-teinte shadow-[0_18px_40px_-12px_rgba(0,0,0,.5)] ring-4 ring-white/10 transition-transform duration-300 hover:-translate-y-2 hover:rotate-0">
                    <img src={p.images[0]} alt={p.name} className="w-full aspect-[4/5] object-cover" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* les garanties */}
      <div className="pleine-largeur border-b border-trait bg-surface">
        <ul className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          {garanties.map(([t, d, lien]) => (
            <li key={t} className="text-sm leading-snug">
              {lien ? <Link href={lien} className="group"><strong className="block text-base group-hover:text-vin">{t}</strong><span className="text-sourdine underline decoration-trait underline-offset-2">{d}</span></Link>
                : <><strong className="block text-base">{t}</strong><span className="text-sourdine">{d}</span></>}
            </li>
          ))}
        </ul>
      </div>

      {!produits.length ? (
        <div className="mt-12 bg-surface border border-dashed border-trait rounded-2xl p-10 text-center max-w-xl mx-auto">
          <Maillot className="h-20 w-auto mx-auto text-vin" />
          <p className="mt-4 titre font-bold text-xl">La collection arrive bientôt</p>
          <p className="mt-1 text-sourdine">On met la dernière main aux maillots. Revenez très vite.</p>
        </div>
      ) : (
        <>
          {/* les casiers : un par rayon */}
          {rayons.length > 1 && (
            <section aria-labelledby="h-rayons" className="mt-12">
              <h2 id="h-rayons" className="groovy text-3xl sm:text-4xl text-vin">Les rayons</h2>
              <ul className={`mt-5 grid gap-4 grid-cols-2 ${rayons.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                {rayons.map((c, i) => {
                  const du = produits.filter((p) => p.category === c);
                  const photo = du.find((p) => p.images[0])?.images[0];
                  return (
                    <li key={c}>
                      <Link href={lien(c, tri)} className="casier group relative flex flex-col justify-end h-56 sm:h-72 rounded-2xl overflow-hidden bg-bordeaux text-white p-4">
                        {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 transition duration-500 group-hover:opacity-90 group-hover:scale-105" loading="lazy" />}
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-bordeaux via-bordeaux/40 to-transparent" />
                        <span aria-hidden className="casier-numero absolute top-3 right-3 grid place-items-center w-11 h-11 rounded-full bg-moutarde text-bordeaux titre font-extrabold text-lg tnum">{i + 1}</span>
                        <span className="relative titre font-extrabold text-2xl">{CATEGORIES[c]}</span>
                        <span className="relative text-sm text-white/80 leading-snug">{ACCROCHES[c]}</span>
                        <span className="relative mt-1 text-xs font-semibold text-moutarde">{du.length} article{du.length > 1 ? "s" : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* tout le catalogue, filtrable */}
          <section id="catalogue" aria-labelledby="h-catalogue" className="mt-14 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="h-catalogue" className="groovy text-3xl sm:text-4xl text-vin">{rayon ? CATEGORIES[rayon] : "Toute la collection"}</h2>
              <p className="text-sm text-sourdine tnum">{liste.length} article{liste.length > 1 ? "s" : ""}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Rayons" className="flex flex-wrap gap-1.5 text-sm font-semibold">
                {[null, ...rayons].map((r) => (
                  <Link key={r ?? "tout"} href={lien(r, tri)} aria-current={rayon === r ? "true" : undefined}
                    className={`rounded-full px-3.5 py-1.5 border transition-colors ${rayon === r ? "bg-bordeaux text-white border-bordeaux" : "border-trait hover:border-vin"}`}>{r ? CATEGORIES[r] : "Tout"}</Link>
                ))}
              </nav>
              <nav aria-label="Trier" className="flex flex-wrap items-center gap-1 text-sm">
                <span className="text-sourdine mr-1">Trier :</span>
                {(Object.keys(TRIS) as Tri[]).map((t) => (
                  <Link key={t} href={lien(rayon, t)} aria-current={tri === t ? "true" : undefined}
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 ${tri === t ? "bg-teinte font-semibold text-encre" : "text-sourdine hover:text-encre"}`}>{TRIS[t]}</Link>
                ))}
              </nav>
            </div>
            <ul className="mt-6 grid gap-x-5 gap-y-9 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {liste.map((p, i) => <li key={p.id}><CarteProduit p={p} priorite={i < 4} /></li>)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
