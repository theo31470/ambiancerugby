"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Appearance, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { lancerAbonnement, preparerCaisse, verifierAbonnement, verifierCodePromo } from "@/app/(site)/abonnement/actions";
import { Ballon } from "@/components/deco/Icones";
import BilletSupporter from "./BilletSupporter";

const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromesse = cle ? loadStripe(cle, { locale: "fr" }).catch(() => null) : null;

const FORMULES = {
  mensuel: { titre: "Mensuel", cents: 299, rythme: "par mois", note: "Sans engagement, résiliable en un clic." },
  annuel: { titre: "Annuel", cents: 2900, rythme: "par an", note: "Soit 2,42 € par mois.", badge: "2 mois offerts" },
} as const;
type Formule = keyof typeof FORMULES;
const euros = (c: number) => `${(c / 100).toFixed(2).replace(".", ",").replace(",00", "")} €`;

/** Les champs de carte prennent les couleurs du site, en clair comme en sombre. */
function apparence(): Appearance {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  const vin = v("--vin", "#934f5e");
  return {
    theme: "flat",
    variables: {
      colorPrimary: vin, colorBackground: v("--surface", "#fff"), colorText: v("--encre", "#2a1419"), colorTextSecondary: v("--sourdine", "#7a6166"),
      colorDanger: v("--alerte", "#b3261e"), fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontSizeBase: "16px", borderRadius: "12px", spacingUnit: "4px",
    },
    rules: {
      ".Input": { border: `2px solid ${v("--trait", "#ecd9dd")}`, boxShadow: "none", padding: "12px 14px", transition: "border-color .15s, box-shadow .15s" },
      ".Input:focus": { border: `2px solid ${vin}`, boxShadow: `0 0 0 4px color-mix(in srgb, ${vin} 18%, transparent)` },
      ".Label": { fontWeight: "600" },
      ".Tab": { border: `2px solid ${v("--trait", "#ecd9dd")}`, boxShadow: "none" },
      ".Tab--selected, .Tab--selected:focus": { borderColor: vin, boxShadow: "none" },
    },
  };
}
const POLICES: StripeElementsOptions["fonts"] = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&display=swap" }];

export default function DevenirSupporter({ connecte, nom, depuis }: { connecte: boolean; nom: string; depuis: string }) {
  const [formule, setFormule] = useState<Formule>("annuel");
  const [promo, setPromo] = useState<{ id: string; code: string; libelle: string; cents: number } | null>(null);
  const [app, setApp] = useState<Appearance | null>(null);
  useEffect(() => { setApp(apparence()); preparerCaisse().catch(() => null); }, []);

  const montant = promo?.cents ?? FORMULES[formule].cents;
  const options = useMemo<StripeElementsOptions | null>(() => app ? ({
    mode: "subscription", amount: Math.max(montant, 50), currency: "eur", appearance: app, fonts: POLICES, locale: "fr",
  }) : null, [app, montant]);

  if (!connecte) return <Link href="/inscription?suite=/abonnement" className="bouton-or"><Ballon className="tourne w-6" />Créer mon compte pour continuer</Link>;
  if (!stripePromesse) return <p className="text-alerte">Le paiement n&apos;est pas encore activé sur le site.</p>;
  if (!options) return <div className="h-96 w-full squelette rounded-3xl" aria-label="Chargement de la caisse" />;

  return (
    <Elements stripe={stripePromesse} options={options}>
      <Caisse formule={formule} setFormule={(f) => { setFormule(f); setPromo(null); }} promo={promo} setPromo={setPromo} montant={montant} nomDefaut={nom} depuis={depuis} />
    </Elements>
  );
}

type Etape = { label: string } | null;

function Caisse({ formule, setFormule, promo, setPromo, montant, nomDefaut, depuis }: {
  formule: Formule; setFormule: (f: Formule) => void;
  promo: { id: string; code: string; libelle: string; cents: number } | null; setPromo: (p: { id: string; code: string; libelle: string; cents: number } | null) => void;
  montant: number; nomDefaut: string; depuis: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [nom, setNom] = useState(nomDefaut);
  const [adresseOk, setAdresseOk] = useState(false);
  const [carteOk, setCarteOk] = useState(false);
  const [pret, setPret] = useState(false);
  const [lent, setLent] = useState(false);
  const [express, setExpress] = useState(false);
  const [etape, setEtape] = useState<Etape>(null);
  const [fini, setFini] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeEnvoi, setCodeEnvoi] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLent(true), 6000); return () => clearTimeout(t); }, []);

  const f = FORMULES[formule];
  const etapes = [
    { label: "Formule", done: true },
    { label: "Facturation", done: nom.trim().length > 1 && adresseOk },
    { label: "Paiement", done: carteOk },
  ];

  const verifierAdresse = () => {
    const el = form.current;
    if (!el) return;
    const champs = ["nom", "ligne1", "cp", "ville"].map((n) => (el.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ?? "");
    setAdresseOk(champs.every(Boolean));
  };

  const payer = async () => {
    if (!stripe || !elements || !form.current || etape) return;
    setErreur(null);
    if (!form.current.reportValidity()) return;
    setEtape({ label: "Vérification de la carte…" });
    const { error: e1 } = await elements.submit();
    if (e1) { setErreur(e1.message ?? "Vérifiez votre carte."); setEtape(null); return; }
    setEtape({ label: "Préparation de l'abonnement…" });
    const fd = new FormData(form.current);
    fd.set("formule", formule);
    if (promo) fd.set("promo", promo.id);
    const r = await lancerAbonnement(fd);
    if (!r.ok) { setErreur(r.message); setEtape(null); return; }
    if (r.secret) {
      setEtape({ label: "Validation par votre banque…" });
      const { error } = await stripe.confirmPayment({
        elements, clientSecret: r.secret, redirect: "if_required",
        confirmParams: { return_url: `${window.location.origin}/abonnement/bienvenue?abonnement=${r.abonnement}` },
      });
      if (error) { setErreur(error.message ?? "Le paiement n'a pas abouti."); setEtape(null); return; }
    }
    setEtape({ label: "Activation de votre badge…" });
    await verifierAbonnement(r.abonnement, false);
    setEtape(null); setFini(true);
    setTimeout(() => router.push(`/abonnement/bienvenue?abonnement=${r.abonnement}`), 1100);
  };

  const appliquerCode = async () => {
    setCodeEnvoi(true); setCodeMsg(null);
    const r = await verifierCodePromo(code, formule);
    setCodeEnvoi(false);
    if (!r.ok) { setCodeMsg(r.message); setPromo(null); return; }
    setPromo({ id: r.id, code: code.trim().toUpperCase(), libelle: r.libelle, cents: r.cents });
    elements?.update({ amount: Math.max(r.cents, 50) });
  };

  const occupe = !!etape || fini;

  return (
    <form ref={form} onSubmit={(e) => { e.preventDefault(); payer(); }} onInput={verifierAdresse} className="caisse grid w-full gap-8 text-left lg:grid-cols-[minmax(0,1fr)_320px]" noValidate={false}>
      <div className="min-w-0">
        <EtapesPaiement etapes={etapes} />

        {/* 1. formule */}
        <fieldset className="mt-7">
          <legend className="titre text-lg font-extrabold">Votre formule</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(Object.keys(FORMULES) as Formule[]).map((id) => {
              const x = FORMULES[id];
              const on = formule === id;
              return (
                <label key={id} className={`choix-formule relative cursor-pointer rounded-2xl border-2 p-4 ${on ? "border-vin bg-teinte" : "border-trait hover:border-vin/50"}`} data-actif={on || undefined}>
                  <input type="radio" name="formule_choix" value={id} checked={on} onChange={() => setFormule(id)} className="sr-only" disabled={occupe} />
                  {"badge" in x && <span className="absolute -top-2.5 right-3 rounded-full bg-moutarde px-2 py-0.5 text-[11px] font-bold text-bordeaux">{x.badge}</span>}
                  <span className="flex items-center justify-between font-bold">{x.titre}<span className="radio-rond" aria-hidden /></span>
                  <span className="mt-1 block"><span className="groovy text-3xl text-vin">{euros(x.cents)}</span> <span className="text-sm text-sourdine">{x.rythme}</span></span>
                  <span className="mt-1 block text-xs text-sourdine">{x.note}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* 2. facturation */}
        <fieldset className="mt-8" disabled={occupe}>
          <legend className="titre text-lg font-extrabold">Facturation</legend>
          <p className="mt-1 text-sm text-sourdine">Ces informations figurent sur vos factures, à retrouver dans votre espace.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-6">
            <Champ className="sm:col-span-6" label="Nom et prénom" name="nom" value={nom} onChange={setNom} auto="name" requis />
            <Champ className="sm:col-span-6" label="Adresse" name="ligne1" auto="address-line1" requis />
            <Champ className="sm:col-span-6" label="Complément (facultatif)" name="ligne2" auto="address-line2" placeholder="Bâtiment, étage…" />
            <Champ className="sm:col-span-2" label="Code postal" name="cp" auto="postal-code" requis mode="numeric" />
            <Champ className="sm:col-span-4" label="Ville" name="ville" auto="address-level2" requis />
            <label className="sm:col-span-6 block">
              <span className="etiquette">Pays</span>
              <select name="pays" defaultValue="FR" autoComplete="country" className="champ">
                {[["FR", "France"], ["BE", "Belgique"], ["CH", "Suisse"], ["LU", "Luxembourg"], ["MC", "Monaco"], ["ES", "Espagne"], ["IT", "Italie"], ["GB", "Royaume-Uni"], ["IE", "Irlande"]].map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        {/* 3. paiement */}
        <div className="mt-8">
          <h3 className="titre text-lg font-extrabold">Paiement</h3>
          <ExpressCheckoutElement
            className="mt-3"
            options={{ buttonHeight: 48, buttonType: { googlePay: "subscribe", applePay: "subscribe", paypal: "pay" }, buttonTheme: { googlePay: "black", applePay: "black" } }}
            onReady={(e) => setExpress(!!e.availablePaymentMethods && Object.values(e.availablePaymentMethods).some(Boolean))}
            onConfirm={payer}
          />
          {express && <p className="my-4 flex items-center gap-3 text-xs text-sourdine before:h-px before:flex-1 before:bg-trait after:h-px after:flex-1 after:bg-trait">ou par carte</p>}
          <div className={`relative rounded-2xl border-2 border-trait bg-surface p-4 transition-colors ${carteOk ? "border-ok/60" : ""} ${express ? "" : "mt-3"}`}>
            {!pret && (
              <div className="space-y-3" aria-hidden>
                <div className="h-11 squelette rounded-xl" />
                <div className="grid grid-cols-2 gap-3"><div className="h-11 squelette rounded-xl" /><div className="h-11 squelette rounded-xl" /></div>
                {lent && <p className="text-xs text-sourdine">Le formulaire de carte met du temps à venir. Un bloqueur de publicité peut l&apos;empêcher de s&apos;afficher.</p>}
              </div>
            )}
            <div className={pret ? "" : "h-0 overflow-hidden"}>
              <PaymentElement onReady={() => setPret(true)} onChange={(e) => setCarteOk(e.complete)}
                options={{ layout: "tabs", terms: { card: "never" }, wallets: { applePay: "never", googlePay: "never" } }} />
            </div>
          </div>
        </div>

        <details className="code-promo mt-5 text-sm">
          <summary className="cursor-pointer font-semibold text-vin">J&apos;ai un code promo</summary>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="champ uppercase" placeholder="CODE" aria-label="Code promo" />
            <button type="button" className="bouton-discret shrink-0" disabled={!code.trim() || codeEnvoi || occupe} onClick={appliquerCode}>{codeEnvoi ? "…" : "Appliquer"}</button>
          </div>
          {codeMsg && <p className="mt-2 text-alerte" role="alert">{codeMsg}</p>}
          {promo && <p className="mt-2 font-semibold text-ok">Code {promo.code} appliqué : {promo.libelle} sur la première échéance.</p>}
        </details>
      </div>

      {/* récapitulatif : le billet se remplit au fil de la saisie */}
      <aside className="lg:sticky lg:top-28 self-start">
        <BilletSupporter nom={nom} formule={f.titre} depuis={depuis} valide={fini} />
        <dl className="mt-5 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-sourdine">Supporter {f.titre.toLowerCase()}</dt><dd className="tnum">{euros(f.cents)}</dd></div>
          {promo && <div className="flex justify-between text-ok"><dt>Code {promo.code}</dt><dd className="tnum">{promo.libelle}</dd></div>}
          <div className="flex items-baseline justify-between border-t border-trait pt-2"><dt className="font-bold">Aujourd&apos;hui</dt><dd key={montant} className="titre tnum text-2xl font-extrabold montant-pop">{euros(montant)}</dd></div>
          <p className="text-xs text-sourdine">Puis {euros(f.cents)} {f.rythme}, renouvelé automatiquement. Résiliable à tout moment depuis votre espace.</p>
        </dl>
        {erreur && <p className="mt-4 rounded-xl bg-alerte/10 px-3 py-2 text-sm text-alerte" role="alert">{erreur}</p>}
        <button disabled={!stripe || !pret || occupe} data-fini={fini || undefined} className="bouton-or bouton-payer mt-5 w-full justify-center py-3.5 text-base disabled:cursor-not-allowed">
          <ContenuBouton idle={`Payer ${euros(montant)}`} etape={etape} fini={fini} />
        </button>
        <p className="mt-3 flex items-start gap-2 text-xs text-sourdine">
          <svg viewBox="0 0 24 24" className="mt-px h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Paiement chiffré, opéré par Stripe. Vos numéros de carte ne passent jamais par nos serveurs.
        </p>
      </aside>
    </form>
  );
}

function Champ({ label, name, value, onChange, auto, requis, mode, placeholder, className = "" }: {
  label: string; name: string; value?: string; onChange?: (v: string) => void; auto?: string; requis?: boolean; mode?: "numeric"; placeholder?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="etiquette">{label}</span>
      <input name={name} className="champ" autoComplete={auto} required={requis} inputMode={mode} placeholder={placeholder} maxLength={200}
        {...(onChange ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})} />
    </label>
  );
}

/** Frise des étapes : chacune se coche dès qu'elle est remplie. */
function EtapesPaiement({ etapes }: { etapes: { label: string; done: boolean }[] }) {
  const courante = etapes.findIndex((e) => !e.done);
  const avance = (courante === -1 ? etapes.length - 1 : courante) / (etapes.length - 1);
  return (
    <ol className="relative grid grid-cols-3" aria-label={`Étapes : ${etapes.filter((e) => e.done).length} sur ${etapes.length} terminées`}>
      <span aria-hidden className="absolute left-[16.66%] right-[16.66%] top-[15px] h-[3px] rounded-full bg-trait">
        <span className="block h-full rounded-full bg-vin transition-[width] duration-500 ease-out" style={{ width: `${avance * 100}%` }} />
      </span>
      {etapes.map((e, i) => (
        <li key={e.label} className="relative flex flex-col items-center gap-1.5 text-center">
          <span data-fait={e.done || undefined} className={`etape-rond grid size-8 place-items-center rounded-full border-2 text-sm font-bold ${e.done ? "border-vin bg-vin text-white" : i === courante ? "border-vin bg-surface text-vin" : "border-trait bg-surface text-sourdine"}`}>
            {e.done ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg> : i + 1}
          </span>
          <span className={`text-xs font-semibold sm:text-sm ${e.done || i === courante ? "" : "text-sourdine"}`}>{e.label}<span className="sr-only">{e.done ? " : terminé" : i === courante ? " : en cours" : ""}</span></span>
        </li>
      ))}
    </ol>
  );
}

function ContenuBouton({ idle, etape, fini }: { idle: string; etape: Etape; fini: boolean }) {
  if (fini) return <span className="flex items-center gap-2"><svg className="coche-trace" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>Bienvenue en tribune !</span>;
  if (etape) return <span className="flex items-center gap-2" aria-live="polite"><Ballon className="w-6 tourne-continu" /><span key={etape.label} className="monte">{etape.label}</span></span>;
  return <><Ballon className="tourne w-6" />{idle}</>;
}
