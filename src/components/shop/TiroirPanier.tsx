"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { panier, usePanier } from "@/lib/shop/panier";
import { detaillerPanier, type LigneDetaillee } from "@/app/(site)/boutique/actions";
import { euros } from "@/lib/shop/format";
import JaugeLivraison from "./JaugeLivraison";

/** Le panier en tiroir : s'ouvre à chaque ajout (ou depuis la barre de la boutique), sans quitter la page. */
export default function TiroirPanier({ seuil }: { seuil: number | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const lignes = usePanier();
  const [detail, setDetail] = useState<LigneDetaillee[] | null>(null);
  const [ajout, setAjout] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    detaillerPanier(lignes).then((d) => { if (actif) setDetail(d); });
    return () => { actif = false; };
  }, [lignes]);
  useEffect(() => {
    const ouvrir = (e: Event) => {
      setAjout((e as CustomEvent<{ variant?: string }>).detail?.variant ?? null);
      if (!ref.current?.open) ref.current?.showModal();
    };
    window.addEventListener("ar:panier-ouvrir", ouvrir);
    return () => window.removeEventListener("ar:panier-ouvrir", ouvrir);
  }, []);
  const fermer = () => ref.current?.close();
  const sousTotal = (detail ?? []).reduce((s, l) => s + l.prix_cents * l.quantite, 0);

  return (
    <dialog ref={ref} aria-labelledby="tiroir-titre" onClick={(e) => { if (e.target === ref.current) fermer(); }}
      className="tiroir m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-fond text-encre p-0 backdrop:bg-bordeaux/50 backdrop:backdrop-blur-[2px]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-trait">
          <h2 id="tiroir-titre" className="groovy text-3xl text-vin">Votre panier</h2>
          <button type="button" onClick={fermer} className="w-10 h-10 grid place-items-center rounded-full hover:bg-teinte" aria-label="Fermer le panier">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {detail === null ? <p className="p-5 text-sourdine">Chargement…</p> : !detail.length ? (
          <div className="p-8 text-center my-auto">
            <p className="titre font-bold text-xl">Votre panier est vide</p>
            <p className="mt-1 text-sourdine">Un petit tour dans le vestiaire ?</p>
            <Link href="/boutique" onClick={fermer} className="bouton-or mt-5">Voir la boutique</Link>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4"><JaugeLivraison sousTotal={sousTotal} seuil={seuil} /></div>
            <ul className="flex-1 overflow-y-auto px-5 py-4 grid gap-3 content-start">
              {detail.map((l) => (
                <li key={l.variant_id} className={`flex gap-3 rounded-2xl p-2 -mx-2 ${l.variant_id === ajout ? "tiroir-ajout" : ""}`}>
                  <Link href={`/boutique/${l.slug}`} onClick={fermer} className="w-20 h-24 shrink-0 rounded-xl bg-teinte overflow-hidden">
                    {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/boutique/${l.slug}`} onClick={fermer} className="font-semibold leading-snug hover:underline underline-offset-4">{l.nom}</Link>
                    <p className="text-sm text-sourdine">{l.detail}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button type="button" aria-label={`Retirer un ${l.nom}`} onClick={() => panier.changer(l.variant_id, l.quantite - 1)} className="w-8 h-8 rounded-full border border-trait hover:border-vin">−</button>
                      <span className="w-6 text-center tnum font-semibold" aria-live="polite">{l.quantite}</span>
                      <button type="button" aria-label={`Ajouter un ${l.nom}`} onClick={() => panier.changer(l.variant_id, l.quantite + 1)} className="w-8 h-8 rounded-full border border-trait hover:border-vin">+</button>
                    </div>
                  </div>
                  <p className="titre font-extrabold tnum">{euros(l.prix_cents * l.quantite)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-trait px-5 py-4 bg-surface">
              <div className="flex justify-between items-baseline"><span className="font-semibold">Sous-total</span><span className="titre font-extrabold text-2xl tnum">{euros(sousTotal)}</span></div>
              <p className="text-xs text-sourdine mt-1">Livraison et codes promo à l&apos;étape suivante.</p>
              <Link href="/boutique/paiement" onClick={fermer} className="bouton-or w-full justify-center mt-4 text-lg py-3">Commander</Link>
              <Link href="/boutique/panier" onClick={fermer} className="block text-center mt-3 text-sm font-semibold text-vin underline underline-offset-4">Voir le panier détaillé</Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
