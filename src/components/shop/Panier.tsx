"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { panier, usePanier } from "@/lib/shop/panier";
import { detaillerPanier, type LigneDetaillee } from "@/app/(site)/boutique/actions";
import { euros } from "@/lib/shop/format";

/** Contenu du panier, recalculé par le serveur à chaque changement. */
export default function Panier() {
  const lignes = usePanier();
  const [detail, setDetail] = useState<LigneDetaillee[] | null>(null);
  useEffect(() => {
    let actif = true;
    detaillerPanier(lignes).then((d) => { if (actif) setDetail(d); });
    return () => { actif = false; };
  }, [lignes]);

  if (detail === null) return <p className="text-sourdine">Chargement du panier…</p>;
  if (!detail.length) return (
    <div className="bg-surface border border-dashed border-trait rounded-2xl p-10 text-center max-w-lg">
      <p className="titre font-bold text-xl">Votre panier est vide</p>
      <p className="mt-1 text-sourdine">Un petit tour en tribune ?</p>
      <Link href="/boutique" className="bouton-or mt-5">Voir la boutique</Link>
    </div>
  );
  const sousTotal = detail.reduce((s, l) => s + l.prix_cents * l.quantite, 0);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul className="grid gap-3 content-start">
        {detail.map((l) => (
          <li key={l.variant_id} className="flex gap-4 bg-surface border border-trait rounded-2xl p-3">
            <Link href={`/boutique/${l.slug}`} className="w-24 h-24 shrink-0 rounded-xl bg-teinte overflow-hidden">
              {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/boutique/${l.slug}`} className="font-semibold hover:underline underline-offset-4">{l.nom}</Link>
              <p className="text-sm text-sourdine">{l.detail}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" aria-label="Retirer un" onClick={() => panier.changer(l.variant_id, l.quantite - 1)} className="w-8 h-8 rounded-full border border-trait hover:border-vin">−</button>
                <span className="w-6 text-center tnum font-semibold" aria-live="polite">{l.quantite}</span>
                <button type="button" aria-label="Ajouter un" onClick={() => panier.changer(l.variant_id, l.quantite + 1)} className="w-8 h-8 rounded-full border border-trait hover:border-vin">+</button>
                <button type="button" onClick={() => panier.retirer(l.variant_id)} className="ml-3 text-sm text-sourdine underline underline-offset-2">Retirer</button>
              </div>
            </div>
            <p className="titre font-extrabold tnum">{euros(l.prix_cents * l.quantite)}</p>
          </li>
        ))}
      </ul>
      <aside className="bg-bordeaux text-white rounded-2xl p-5 h-fit lg:sticky lg:top-24">
        <dl className="grid gap-2">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tnum font-semibold">{euros(sousTotal)}</dd></div>
          <div className="flex justify-between text-white/70 text-sm"><dt>Livraison</dt><dd>calculée à l&apos;étape suivante</dd></div>
        </dl>
        <Link href="/boutique/paiement" className="bouton-or w-full justify-center mt-5">Passer commande</Link>
        <Link href="/boutique" className="block text-center mt-3 text-sm text-white/80 underline underline-offset-2">Continuer mes achats</Link>
      </aside>
    </div>
  );
}
