"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import { panier } from "@/lib/shop/panier";
import { euros } from "@/lib/shop/format";
import type { Produit } from "@/lib/shop/catalogue";

const ORDRE_TAILLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

/** Galerie, choix de la couleur et de la taille, ajout au panier. */
export default function ChoixProduit({ p }: { p: Produit }) {
  const couleurs = useMemo(() => [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, v.color_hex])).entries()], [p.variants]);
  const [couleur, setCouleur] = useState<string | null>(couleurs[0]?.[0] ?? null);
  const tailles = useMemo(() => p.variants.filter((v) => !couleur || v.color === couleur).filter((v) => v.size)
    .sort((a, b) => ORDRE_TAILLES.indexOf(a.size!) - ORDRE_TAILLES.indexOf(b.size!)), [p.variants, couleur]);
  const [taille, setTaille] = useState<string | null>(null);
  const variante = p.variants.find((v) => (!couleur || v.color === couleur) && (tailles.length ? v.size === taille : true)) ?? null;
  const images = [variante?.image, ...p.images].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  const [vue, setVue] = useState(0);
  const [ajoute, setAjoute] = useState(false);
  const prix = variante?.price_cents ?? p.price_cents;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <div>
        <div className="relative aspect-square rounded-3xl bg-teinte overflow-hidden">
          {images[vue] && <img key={images[vue]} src={images[vue]} alt={p.name} className="absolute inset-0 w-full h-full object-cover animate-[apparait_.4s_ease-out]" />}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto defile-scroll">
            {images.map((src, i) => (
              <button key={src} type="button" onClick={() => setVue(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === vue}
                className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${i === vue ? "border-vin" : "border-transparent"}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="groovy text-4xl sm:text-5xl text-vin leading-tight">{p.name}</h1>
        <p className="mt-3 titre font-extrabold text-3xl">{euros(prix)}</p>
        {p.description && <p className="mt-5 text-lg max-w-prose whitespace-pre-line">{p.description}</p>}

        {couleurs.length > 0 && (
          <fieldset className="mt-7">
            <legend className="font-semibold mb-2">Couleur{couleur ? <span className="font-normal text-sourdine"> : {couleur}</span> : null}</legend>
            <div className="flex flex-wrap gap-2">
              {couleurs.map(([nom, hex]) => (
                <button key={nom} type="button" onClick={() => { setCouleur(nom); setTaille(null); setVue(0); }} aria-pressed={nom === couleur} title={nom}
                  className={`w-10 h-10 rounded-full border-2 ${nom === couleur ? "border-vin ring-2 ring-vin ring-offset-2 ring-offset-fond" : "border-trait"}`} style={{ background: hex ?? "#ccc" }}>
                  <span className="sr-only">{nom}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {tailles.length > 0 && (
          <fieldset className="mt-6">
            <legend className="font-semibold mb-2">Taille</legend>
            <div className="flex flex-wrap gap-2">
              {tailles.map((v) => (
                <button key={v.id} type="button" onClick={() => setTaille(v.size)} aria-pressed={v.size === taille}
                  className={`min-w-12 h-11 px-3 rounded-xl border-2 font-semibold ${v.size === taille ? "border-vin bg-vin text-white" : "border-trait hover:border-vin"}`}>
                  {v.size}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!variante || (tailles.length > 0 && !taille)}
            onClick={() => { if (!variante) return; panier.ajouter(variante.id); setAjoute(true); setTimeout(() => setAjoute(false), 2200); }}
            className="bouton-or text-lg px-6 py-3 disabled:opacity-50">
            {ajoute ? "Dans le panier !" : tailles.length && !taille ? "Choisissez une taille" : "Ajouter au panier"}
          </button>
          {ajoute && <Link href="/boutique/panier" className="font-semibold text-vin underline underline-offset-4">Voir le panier</Link>}
        </div>
        <ul className="mt-8 grid gap-2 text-sm text-sourdine">
          <li>Fabriqué à la demande : expédié sous 3 à 7 jours ouvrés, puis livré en suivi.</li>
          <li>Paiement sécurisé par carte bancaire, facture envoyée avec chaque commande.</li>
        </ul>
      </div>
    </div>
  );
}
