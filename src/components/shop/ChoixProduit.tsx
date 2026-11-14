"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { panier } from "@/lib/shop/panier";
import { euros } from "@/lib/shop/format";
import type { Produit } from "@/lib/shop/catalogue";
import type { Guide } from "@/lib/shop/guides";
import { fondPastille, rangTaille } from "@/lib/shop/couleurs";

/**
 * Fiche article : galerie, couleur, taille (avec le guide des tailles), quantité, ajout au panier (le tiroir s'ouvre),
 * puis les infos pratiques en accordéon.
 */
export default function ChoixProduit({ p, guide, details, seuil }: { p: Produit; guide: Guide | null; details: string; seuil: number | null }) {
  const couleurs = useMemo(() => [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, v.color_hex])).entries()], [p.variants]);
  const [couleur, setCouleur] = useState<string | null>(couleurs[0]?.[0] ?? null);
  const tailles = useMemo(() => p.variants.filter((v) => !couleur || v.color === couleur).filter((v) => v.size)
    .sort((a, b) => rangTaille(a.size) - rangTaille(b.size)), [p.variants, couleur]);
  const [tailleChoisie, setTaille] = useState<string | null>(null);
  // une seule taille (casquette, mug…) : elle est choisie d'office et le sélecteur n'est pas montré
  const tailleUnique = tailles.length === 1;
  const taille = tailleUnique ? tailles[0].size : tailleChoisie;
  const variante = p.variants.find((v) => (!couleur || v.color === couleur) && (tailles.length ? v.size === taille : true)) ?? null;
  // maquettes rangées par couleur (« …/maroon-dos.webp », « …/maroon-face.webp ») : on montre les vues de la couleur choisie
  const vueDe = (u: string) => u.match(/^(.*)-(dos|face)\.(webp|png|jpe?g)$/);
  // photo de la couleur choisie, même avant le choix de la taille
  const imageCouleur = variante?.image ?? p.variants.find((v) => (!couleur || v.color === couleur) && v.image)?.image ?? null;
  const serie = imageCouleur ? vueDe(imageCouleur)?.[1] : null;
  const images = (serie
    ? [imageCouleur, ...p.images.filter((x) => vueDe(x)?.[1] === serie)]
    : [imageCouleur, ...p.images]
  ).filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  const [vue, setVue] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [manqueTaille, setManqueTaille] = useState(false);
  const guideRef = useRef<HTMLDialogElement>(null);
  const debutDoigt = useRef<number | null>(null);
  const prix = variante?.price_cents ?? p.price_cents;
  const choixTaille = tailles.length > 1;
  // coques de téléphone : on choisit un modèle, pas une taille
  const motTaille = tailles.some((v) => /iphone|galaxy|samsung|pixel/i.test(v.size ?? "")) ? "Modèle" : "Taille";

  const ajouter = () => {
    if (choixTaille && !taille) { setManqueTaille(true); document.getElementById("choix-taille")?.focus(); return; }
    if (!variante) return;
    panier.ajouter(variante.id, quantite);
    window.dispatchEvent(new CustomEvent("ar:panier-ouvrir", { detail: { variant: variante.id } }));
    setQuantite(1);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      {/* galerie : défilement au doigt sur mobile, miniatures sur grand écran */}
      <div className="lg:sticky lg:top-24 self-start">
        <div className="relative aspect-[4/5] rounded-3xl bg-teinte overflow-hidden touch-pan-y"
          onTouchStart={(e) => { debutDoigt.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (debutDoigt.current ?? e.changedTouches[0].clientX);
            if (Math.abs(dx) > 40 && images.length > 1) setVue((vue + (dx < 0 ? 1 : -1) + images.length) % images.length);
            debutDoigt.current = null;
          }}>
          {images[vue] && <img key={images[vue]} src={images[vue]} alt={`${p.name}${couleur ? `, ${couleur}` : ""}`} className="absolute inset-0 w-full h-full object-cover animate-[apparait_.4s_ease-out]" />}
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === vue ? "w-5 bg-encre" : "w-1.5 bg-encre/30"}`} />)}
            </div>
          )}
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => setVue((vue - 1 + images.length) % images.length)} aria-label="Photo précédente" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface/90 grid place-items-center shadow-sm hover:bg-surface">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
              </button>
              <button type="button" onClick={() => setVue((vue + 1) % images.length)} aria-label="Photo suivante" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface/90 grid place-items-center shadow-sm hover:bg-surface">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 hidden lg:flex gap-2 overflow-x-auto defile-scroll">
            {images.map((src, i) => (
              <button key={src} type="button" onClick={() => setVue(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === vue}
                className={`shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-colors ${i === vue ? "border-vin" : "border-transparent hover:border-trait"}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="groovy text-4xl sm:text-5xl text-vin leading-[1.05]">{p.name}</h1>
        <p className="mt-3 titre font-extrabold text-3xl tnum">{euros(prix)}</p>
        {seuil && <p className="mt-1 text-sm text-sourdine">Livraison offerte dès {euros(seuil)} d&apos;achat</p>}
        {p.description && <p className="mt-5 text-lg max-w-prose whitespace-pre-line">{p.description}</p>}

        {couleurs.length > 0 && (
          <fieldset className="mt-7">
            <legend className="font-semibold mb-2">Couleur{couleur ? <span className="font-normal text-sourdine"> : {couleur}</span> : null}</legend>
            <div className="flex flex-wrap gap-2">
              {couleurs.map(([nom, hex]) => (
                <button key={nom} type="button" onClick={() => { setCouleur(nom); setTaille(null); setVue(0); }} aria-pressed={nom === couleur} title={nom}
                  className={`w-10 h-10 rounded-full border-2 transition-shadow ${nom === couleur ? "border-vin ring-2 ring-vin ring-offset-2 ring-offset-fond" : "border-trait hover:ring-2 hover:ring-trait hover:ring-offset-2 hover:ring-offset-fond"}`} style={{ background: fondPastille(hex) }}>
                  <span className="sr-only">{nom}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {choixTaille && (
          <fieldset className="mt-6">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <legend className="font-semibold">{motTaille}{taille ? <span className="font-normal text-sourdine"> : {taille}</span> : null}</legend>
              {guide && <button type="button" onClick={() => guideRef.current?.showModal()} className="text-sm font-semibold text-vin underline underline-offset-4">Guide des tailles</button>}
            </div>
            <div id="choix-taille" tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
              {tailles.map((v) => (
                <button key={v.id} type="button" onClick={() => { setTaille(v.size); setManqueTaille(false); }} aria-pressed={v.size === taille}
                  className={`min-w-14 h-12 px-3 rounded-xl border-2 font-semibold transition-colors ${v.size === taille ? "border-bordeaux bg-bordeaux text-white" : "border-trait hover:border-vin"}`}>
                  {v.size}
                </button>
              ))}
            </div>
            {manqueTaille && <p role="alert" className="mt-2 text-sm font-semibold text-alerte">{motTaille === "Modèle" ? "Choisissez le modèle de votre téléphone" : "Choisissez une taille"} avant d&apos;ajouter au panier.</p>}
          </fieldset>
        )}

        <div className="mt-8 flex flex-wrap items-stretch gap-3">
          <div className="flex items-center rounded-full border-2 border-trait" role="group" aria-label="Quantité">
            <button type="button" onClick={() => setQuantite(Math.max(1, quantite - 1))} aria-label="Un de moins" className="w-11 h-full text-lg">−</button>
            <span className="w-8 text-center tnum font-semibold" aria-live="polite">{quantite}</span>
            <button type="button" onClick={() => setQuantite(Math.min(20, quantite + 1))} aria-label="Un de plus" className="w-11 h-full text-lg">+</button>
          </div>
          <button type="button" onClick={ajouter} disabled={!variante && !choixTaille} className="bouton-or flex-1 justify-center text-lg px-6 py-3.5 disabled:opacity-50">
            Ajouter au panier
          </button>
        </div>

        <ul className="mt-6 grid gap-1.5 text-sm">
          <li className="flex gap-2"><span aria-hidden className="text-ok">✓</span>Fabriqué pour vous, expédié sous 2 à 5 jours ouvrés</li>
          <li className="flex gap-2"><span aria-hidden className="text-ok">✓</span>Livraison suivie, numéro de colis par e-mail</li>
          <li className="flex gap-2"><span aria-hidden className="text-ok">✓</span>14 jours pour changer d&apos;avis</li>
        </ul>

        <div className="mt-8 border-t border-trait divide-y divide-trait">
          <details className="group py-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Détails et entretien<span aria-hidden className="transition-transform group-open:rotate-45 text-xl">+</span></summary>
            <p className="mt-3 text-sourdine whitespace-pre-line">{details}</p>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Livraison<span aria-hidden className="transition-transform group-open:rotate-45 text-xl">+</span></summary>
            <p className="mt-3 text-sourdine">Chaque article est fabriqué à la demande puis expédié sous 2 à 5 jours ouvrés. Comptez ensuite 3 à 7 jours de transport en France métropolitaine. Les frais exacts s&apos;affichent avec votre adresse, avant le paiement.{seuil ? ` La livraison est offerte dès ${euros(seuil)} d'achat.` : ""}</p>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Retours et échanges<span aria-hidden className="transition-transform group-open:rotate-45 text-xl">+</span></summary>
            <p className="mt-3 text-sourdine">Vous avez 14 jours après réception pour changer d&apos;avis : faites la demande depuis la page de suivi de votre commande. Un défaut d&apos;impression ou une erreur de notre part ? L&apos;article est remplacé ou remboursé, sans frais. <Link href="/boutique/aide#retours" className="text-vin underline underline-offset-2">Tout savoir sur les retours</Link></p>
          </details>
        </div>
      </div>

      {guide && (
        <dialog ref={guideRef} aria-labelledby="guide-titre" onClick={(e) => { if (e.target === guideRef.current) guideRef.current?.close(); }}
          className="m-auto rounded-3xl bg-fond text-encre p-0 w-[min(32rem,calc(100vw-2rem))] backdrop:bg-bordeaux/50">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="guide-titre" className="groovy text-3xl text-vin">Guide des tailles</h2>
              <button type="button" onClick={() => guideRef.current?.close()} className="w-10 h-10 -mr-2 -mt-1 grid place-items-center rounded-full hover:bg-teinte" aria-label="Fermer le guide">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <p className="mt-1 font-semibold">{guide.titre}</p>
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Mesures en centimètres, vêtement posé à plat</caption>
              <thead><tr className="border-b border-trait text-left text-sourdine">{guide.colonnes.map((c) => <th key={c} scope="col" className="py-2 font-semibold">{c}</th>)}</tr></thead>
              <tbody>
                {guide.lignes.map(([t, ...m]) => (
                  <tr key={t} className={`border-b border-trait last:border-0 ${t === taille ? "bg-teinte font-semibold" : ""}`}>
                    <th scope="row" className="py-2 text-left">{t}</th>
                    {m.map((x, i) => <td key={i} className="py-2 tnum">{x} cm</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-sourdine">Mesures du vêtement posé à plat : la largeur de poitrine se prend d&apos;une aisselle à l&apos;autre. {guide.conseil}</p>
          </div>
        </dialog>
      )}
    </div>
  );
}
