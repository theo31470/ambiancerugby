"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { usePanier } from "@/lib/shop/panier";
import { calculerDevis, preparerPaiement, type Adresse, type Devis, type LigneDetaillee } from "@/app/(site)/boutique/actions";
import { euros, PAYS } from "@/lib/shop/format";
import EtapesCommande from "./EtapesCommande";
import JaugeLivraison from "./JaugeLivraison";

const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromesse = cle ? loadStripe(cle) : null;
const CLE_CODE = "ar-code-promo";

/**
 * Étape « Livraison » : adresse, frais de port réels, code promo, récapitulatif.
 * Étape « Paiement » : le formulaire Stripe intégré à la page (carte, Apple Pay, Google Pay).
 */
export default function Paiement({ email }: { email: string | null }) {
  const lignes = usePanier();
  const [items, setItems] = useState<LigneDetaillee[]>([]);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [a, setA] = useState<Adresse>({ email: email ?? "", nom: "", adresse1: "", adresse2: "", cp: "", ville: "", pays: "FR", tel: "" });
  // un code saisi plus tôt dans la visite suit jusqu'ici
  const [code, setCode] = useState<string | null>(() => { try { return typeof window === "undefined" ? null : sessionStorage.getItem(CLE_CODE); } catch { return null; } });
  const [saisieCode, setSaisieCode] = useState("");
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  // devis recalculé à chaque changement du panier, de l'adresse (code postal, ville, pays) ou du code
  const cleDevis = `${a.pays}|${a.cp}|${a.ville}|${code}|${lignes.map((l) => l.variant_id + l.quantite).join()}`;
  useEffect(() => {
    if (!lignes.length) return;
    let ok = true;
    const t = setTimeout(async () => {
      setCalcul(true);
      const r = await calculerDevis(lignes, a.cp.trim() && a.ville.trim() ? { pays: a.pays, cp: a.cp, ville: a.ville } : null, code);
      if (!ok) return;
      setCalcul(false);
      if (r.ok) { setItems(r.items); setDevis(r.devis); setErreur(null); }
      else if (r.codeInvalide) { setErreurCode(r.message); setCode(null); try { sessionStorage.removeItem(CLE_CODE); } catch { /* */ } }
      else { setDevis((d) => (d ? { ...d, livraison: null } : d)); setErreur(r.message); }
    }, 450);
    return () => { ok = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleDevis]);

  const options = useMemo(() => (secret ? { clientSecret: secret } : null), [secret]);
  const champ = (k: keyof Adresse, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1 text-sm font-semibold">{label}
      <input value={a[k] ?? ""} onChange={(e) => setA({ ...a, [k]: e.target.value })} className="champ font-normal" {...props} />
    </label>
  );
  const appliquer = (c: string | null) => {
    setErreurCode(null);
    setCode(c);
    try { if (c) sessionStorage.setItem(CLE_CODE, c); else sessionStorage.removeItem(CLE_CODE); } catch { /* */ }
  };

  if (!lignes.length && !secret) return (
    <div className="bg-surface border border-dashed border-trait rounded-2xl p-10 text-center max-w-lg">
      <p className="titre font-bold text-xl">Votre panier est vide</p>
      <Link href="/boutique" className="bouton-or mt-5">Voir la boutique</Link>
    </div>
  );
  if (!stripePromesse) return <p className="rounded-xl bg-alerte/10 text-alerte p-4">Le paiement n&apos;est pas encore activé sur le site (clé Stripe manquante).</p>;

  return (
    <>
      <EtapesCommande actuelle={secret ? 2 : 1} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          {!secret ? (
            <form className="grid gap-4 bg-surface border border-trait rounded-2xl p-5 sm:p-6" onSubmit={async (e) => {
              e.preventDefault();
              setEnvoi(true); setErreur(null);
              const r = await preparerPaiement(lignes, a, code);
              setEnvoi(false);
              if (r.ok) { setSecret(r.clientSecret); window.scrollTo({ top: 0, behavior: "smooth" }); } else setErreur(r.message);
            }}>
              <h2 className="titre font-bold text-xl">Vos coordonnées</h2>
              {champ("email", "E-mail (confirmation, facture et suivi)", { type: "email", required: true, autoComplete: "email" })}
              <h2 className="titre font-bold text-xl mt-2">Adresse de livraison</h2>
              {champ("nom", "Nom et prénom", { required: true, autoComplete: "name" })}
              {champ("adresse1", "Adresse", { required: true, autoComplete: "address-line1" })}
              {champ("adresse2", "Complément (facultatif)", { autoComplete: "address-line2" })}
              <div className="grid gap-4 grid-cols-[8rem_1fr]">
                {champ("cp", "Code postal", { required: true, autoComplete: "postal-code", inputMode: "numeric" })}
                {champ("ville", "Ville", { required: true, autoComplete: "address-level2" })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">Pays
                  <select value={a.pays} onChange={(e) => setA({ ...a, pays: e.target.value })} className="champ font-normal" autoComplete="country">
                    {Object.entries(PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                {champ("tel", "Téléphone (pour le transporteur)", { type: "tel", autoComplete: "tel" })}
              </div>
              {devis?.livraison && (
                <p className="rounded-xl bg-teinte px-4 py-3 text-sm">
                  <strong>{devis.livraison.libelle}</strong>{devis.livraison.delai ? `, livré en ${devis.livraison.delai} après expédition` : ""} :{" "}
                  {devis.livraison.offerte ? <><s className="text-sourdine">{euros(devis.livraison.brut)}</s> <strong className="text-ok">offerte</strong></> : <strong className="tnum">{euros(devis.livraison.cents)}</strong>}
                </p>
              )}
              {erreur && <p role="alert" className="rounded-lg bg-alerte/10 text-alerte px-3 py-2 text-sm">{erreur}</p>}
              <button className="bouton-or justify-center text-lg py-3.5 mt-1" disabled={envoi || !devis?.livraison || calcul}>
                {envoi ? "Préparation du paiement…" : devis?.livraison ? `Continuer vers le paiement · ${euros(devis.total)}` : "Indiquez votre adresse"}
              </button>
              <p className="text-xs text-sourdine">En continuant, vous acceptez les <Link href="/boutique/cgv" className="underline underline-offset-2">conditions générales de vente</Link>. Paiement sécurisé par Stripe : vos coordonnées bancaires ne passent jamais par Ambiance Rugby.</p>
            </form>
          ) : (
            <div>
              <button type="button" onClick={() => setSecret(null)} className="mb-3 text-sm font-semibold text-vin underline underline-offset-4">Modifier l&apos;adresse</button>
              <div className="bg-surface border border-trait rounded-2xl p-2 sm:p-4">
                <EmbeddedCheckoutProvider stripe={stripePromesse} options={options!}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          )}
        </div>

        {/* le récapitulatif */}
        <aside className="h-fit lg:sticky lg:top-24 grid gap-3">
          <div className="bg-bordeaux text-white rounded-2xl p-5">
            <h2 className="titre font-bold text-lg mb-3">Votre commande</h2>
            <ul className="grid gap-3">
              {items.map((l) => (
                <li key={l.variant_id} className="flex gap-3 items-center">
                  <span className="relative w-14 h-16 shrink-0 rounded-lg bg-white/10 overflow-hidden">
                    {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-moutarde text-bordeaux text-[11px] font-bold tnum">{l.quantite}</span>
                  </span>
                  <span className="flex-1 min-w-0 text-sm leading-snug">{l.nom}<span className="block text-white/60">{l.detail}</span></span>
                  <span className="tnum text-sm">{euros(l.prix_cents * l.quantite)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 pt-4 border-t border-white/20 grid gap-1.5 text-sm">
              <div className="flex justify-between"><dt>Sous-total</dt><dd className="tnum">{devis ? euros(devis.sousTotal) : "–"}</dd></div>
              {devis && devis.remise > 0 && <div className="flex justify-between text-moutarde"><dt>Code {devis.code}</dt><dd className="tnum">−{euros(devis.remise)}</dd></div>}
              <div className="flex justify-between"><dt>Livraison</dt><dd className="tnum">{calcul ? "calcul…" : devis?.livraison ? (devis.livraison.offerte ? "Offerte" : euros(devis.livraison.cents)) : "selon l'adresse"}</dd></div>
              <div className="flex justify-between items-baseline titre font-extrabold text-2xl mt-2"><dt>Total</dt><dd className="tnum">{devis ? euros(devis.total) : "–"}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-white/60">TVA non applicable, art. 293 B du CGI.</p>
          </div>

          {!secret && (
            <div className="bg-surface border border-trait rounded-2xl p-4">
              {code && devis?.code ? (
                <p className="flex items-center justify-between gap-3 text-sm">
                  <span>Code <strong>{devis.code}</strong> appliqué{devis.libelleCode ? ` (${devis.libelleCode})` : ""}</span>
                  <button type="button" onClick={() => appliquer(null)} className="text-sourdine underline underline-offset-2">Retirer</button>
                </p>
              ) : (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (saisieCode.trim()) appliquer(saisieCode.trim().toUpperCase()); }}>
                  <label className="sr-only" htmlFor="code-promo">Code promo</label>
                  <input id="code-promo" value={saisieCode} onChange={(e) => { setSaisieCode(e.target.value); setErreurCode(null); }} placeholder="Code promo" autoComplete="off" className="champ flex-1 uppercase" />
                  <button className="bouton-discret">Appliquer</button>
                </form>
              )}
              {erreurCode && <p role="alert" className="mt-2 text-sm text-alerte">{erreurCode}</p>}
            </div>
          )}
          {devis && <JaugeLivraison sousTotal={devis.sousTotal - devis.remise} seuil={devis.seuil} />}
          <ul className="text-xs text-sourdine grid gap-1 px-1">
            <li>Paiement par carte, Apple Pay ou Google Pay</li>
            <li>14 jours pour changer d&apos;avis après réception</li>
            <li>Facture envoyée avec la confirmation</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
