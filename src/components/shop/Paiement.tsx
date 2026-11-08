"use client";
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { usePanier } from "@/lib/shop/panier";
import { detaillerPanier, estimerLivraison, preparerPaiement, type Adresse, type LigneDetaillee } from "@/app/boutique/actions";
import { euros, PAYS } from "@/lib/shop/format";

const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromesse = cle ? loadStripe(cle) : null;

type Livraison = { cents: number; libelle: string; delai: string | null } | null;

/** Étape 1 : adresse et frais de port réels. Étape 2 : formulaire de paiement Stripe intégré à la page. */
export default function Paiement({ email }: { email: string | null }) {
  const lignes = usePanier();
  const [detail, setDetail] = useState<LigneDetaillee[]>([]);
  const [a, setA] = useState<Adresse>({ email: email ?? "", nom: "", adresse1: "", adresse2: "", cp: "", ville: "", pays: "FR", tel: "" });
  const [liv, setLiv] = useState<Livraison>(null);
  const [calcul, setCalcul] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => { let ok = true; detaillerPanier(lignes).then((d) => ok && setDetail(d)); return () => { ok = false; }; }, [lignes]);
  // frais de port recalculés quand l'adresse est complète
  const cleAdresse = `${a.pays}|${a.cp}|${a.ville}|${lignes.map((l) => l.variant_id + l.quantite).join()}`;
  useEffect(() => {
    if (!a.cp.trim() || !a.ville.trim() || !lignes.length) return;
    let ok = true;
    const t = setTimeout(async () => {
      setCalcul(true);
      const r = await estimerLivraison(lignes, a.pays, a.cp, a.ville);
      if (!ok) return;
      setCalcul(false);
      if (r.ok) { setLiv({ cents: r.cents, libelle: r.libelle, delai: r.delai }); setErreur(null); } else { setLiv(null); setErreur(r.message); }
    }, 500);
    return () => { ok = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleAdresse]);

  const sousTotal = detail.reduce((s, l) => s + l.prix_cents * l.quantite, 0);
  const options = useMemo(() => (secret ? { clientSecret: secret } : null), [secret]);
  const champ = (k: keyof Adresse, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1 text-sm font-semibold">{label}
      <input value={a[k] ?? ""} onChange={(e) => setA({ ...a, [k]: e.target.value })} className="champ font-normal" {...props} />
    </label>
  );

  if (!lignes.length && !secret) return <p className="text-sourdine">Votre panier est vide.</p>;
  if (!stripePromesse) return <p className="rounded-xl bg-alerte/10 text-alerte p-4">Le paiement n&apos;est pas encore activé sur le site (clé Stripe manquante).</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        {!secret ? (
          <form className="grid gap-4 bg-surface border border-trait rounded-2xl p-5" onSubmit={async (e) => {
            e.preventDefault();
            setEnvoi(true); setErreur(null);
            const r = await preparerPaiement(lignes, a);
            setEnvoi(false);
            if (r.ok) setSecret(r.clientSecret); else setErreur(r.message);
          }}>
            <h2 className="titre font-bold text-xl">Livraison</h2>
            {champ("email", "E-mail (pour la facture et le suivi)", { type: "email", required: true, autoComplete: "email" })}
            {champ("nom", "Nom et prénom", { required: true, autoComplete: "name" })}
            {champ("adresse1", "Adresse", { required: true, autoComplete: "address-line1" })}
            {champ("adresse2", "Complément (facultatif)", { autoComplete: "address-line2" })}
            <div className="grid gap-4 grid-cols-[8rem_1fr]">
              {champ("cp", "Code postal", { required: true, autoComplete: "postal-code" })}
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
            {erreur && <p role="alert" className="rounded-lg bg-alerte/10 text-alerte px-3 py-2 text-sm">{erreur}</p>}
            <button className="bouton-or justify-center text-lg py-3" disabled={envoi || !liv}>
              {envoi ? "Préparation du paiement…" : liv ? `Payer ${euros(sousTotal + liv.cents)}` : "Indiquez votre adresse"}
            </button>
            <p className="text-xs text-sourdine">Paiement par carte, sécurisé par Stripe. Vos coordonnées bancaires ne passent jamais par Ambiance Rugby.</p>
          </form>
        ) : (
          <div className="bg-surface border border-trait rounded-2xl p-2 sm:p-4">
            <EmbeddedCheckoutProvider stripe={stripePromesse} options={options!}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
      <aside className="bg-bordeaux text-white rounded-2xl p-5 h-fit lg:sticky lg:top-24">
        <h2 className="titre font-bold text-lg mb-3">Votre commande</h2>
        <ul className="grid gap-2 text-sm">
          {detail.map((l) => (
            <li key={l.variant_id} className="flex justify-between gap-3"><span>{l.quantite} × {l.nom} <span className="text-white/60">({l.detail})</span></span><span className="tnum">{euros(l.prix_cents * l.quantite)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-white/20 grid gap-1.5">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tnum">{euros(sousTotal)}</dd></div>
          <div className="flex justify-between"><dt>Livraison</dt><dd className="tnum">{calcul ? "calcul…" : liv ? euros(liv.cents) : "–"}</dd></div>
          {liv?.delai && <p className="text-xs text-white/60 text-right">{liv.libelle}, {liv.delai}</p>}
          <div className="flex justify-between titre font-extrabold text-xl mt-2"><dt>Total</dt><dd className="tnum">{euros(sousTotal + (liv?.cents ?? 0))}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-white/60">TVA non applicable, art. 293 B du CGI.</p>
      </aside>
    </div>
  );
}
