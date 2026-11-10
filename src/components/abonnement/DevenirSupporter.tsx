"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { loadStripe, type Appearance, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { demarrerAbonnement, verifierAbonnement } from "@/app/abonnement/actions";
import { Ballon } from "@/components/deco/Icones";

const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromesse = cle ? loadStripe(cle, { locale: "fr" }) : null;

/** Formulaire de paiement habillé aux couleurs du site : rien ne rappelle un formulaire tiers. */
const APPARENCE: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#934f5e", colorBackground: "#ffffff", colorText: "#2a1419", colorTextSecondary: "#7a6166", colorDanger: "#b3261e",
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontSizeBase: "16px", borderRadius: "14px", spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "2px solid #ecd9dd", boxShadow: "none", padding: "12px 14px" },
    ".Input:focus": { border: "2px solid #934f5e", boxShadow: "0 0 0 3px rgba(147,79,94,.15)" },
    ".Label": { fontWeight: "600", color: "#2a1419" },
    ".AccordionItem": { border: "2px solid #ecd9dd", boxShadow: "none" },
    ".AccordionItem--selected": { border: "2px solid #934f5e" },
    ".Tab": { border: "2px solid #ecd9dd" },
    ".Tab--selected": { borderColor: "#934f5e", boxShadow: "none" },
  },
};
const POLICES: StripeElementsOptions["fonts"] = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&display=swap" }];

const FORMULES = [
  { id: "mensuel", titre: "Mensuel", prix: "2,99 €", rythme: "par mois", note: "Sans engagement, résiliable en un clic." },
  { id: "annuel", titre: "Annuel", prix: "29 €", rythme: "par an", note: "Soit 2,42 € par mois : deux mois offerts.", badge: "2 mois offerts" },
] as const;

export default function DevenirSupporter({ connecte }: { connecte: boolean }) {
  const [formule, setFormule] = useState<"mensuel" | "annuel">("annuel");
  const [etape, setEtape] = useState<"choix" | "paiement" | "bienvenue">("choix");
  const [secret, setSecret] = useState<string | null>(null);
  const [abonnement, setAbonnement] = useState<string | null>(null);
  const [montant, setMontant] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const options = useMemo<StripeElementsOptions | null>(() => (secret ? { clientSecret: secret, appearance: APPARENCE, fonts: POLICES, locale: "fr" } : null), [secret]);

  if (!connecte) return <Link href="/inscription?suite=/abonnement" className="bouton-or"><Ballon className="tourne w-6" />Créer mon compte pour continuer</Link>;
  if (!stripePromesse) return <p className="text-alerte">Le paiement n&apos;est pas encore activé sur le site.</p>;

  if (etape === "bienvenue") {
    return (
      <div className="text-center max-w-sm">
        <Ballon className="w-16 mx-auto text-vin animate-bounce" />
        <p className="groovy text-4xl text-vin mt-3">Bienvenue en tribune !</p>
        <p className="mt-2 text-sourdine">Vous êtes Supporter. Votre badge doré est actif et tout le site vous est ouvert.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/compte/abonnement" className="bouton-discret">Mon abonnement et mes factures</Link>
          <Link href="/" className="bouton-or">Retour au site</Link>
        </div>
      </div>
    );
  }

  if (etape === "paiement" && options) {
    const f = FORMULES.find((x) => x.id === formule)!;
    return (
      <div className="text-left w-full max-w-md">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-teinte px-4 py-3">
          <div>
            <p className="font-bold">Supporter {f.titre.toLowerCase()}</p>
            <p className="text-sm text-sourdine">Renouvelé automatiquement, résiliable à tout moment</p>
          </div>
          <p className="titre text-2xl font-extrabold tnum whitespace-nowrap">{montant}</p>
        </div>
        <Elements stripe={stripePromesse} options={options}>
          <FormulairePaiement montant={montant} abonnement={abonnement!} onSucces={() => setEtape("bienvenue")} />
        </Elements>
        <button type="button" onClick={() => { setEtape("choix"); setSecret(null); }} className="mt-4 text-sm text-sourdine underline underline-offset-4">Changer de formule</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md text-left">
      <fieldset>
        <legend className="sr-only">Choisissez votre formule</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {FORMULES.map((x) => (
            <label key={x.id} className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-colors ${formule === x.id ? "border-vin bg-teinte" : "border-trait hover:border-vin/50"}`}>
              <input type="radio" name="formule" value={x.id} checked={formule === x.id} onChange={() => setFormule(x.id)} className="sr-only" />
              {"badge" in x && <span className="absolute -top-2.5 right-3 text-[11px] font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5">{x.badge}</span>}
              <span className="block font-bold">{x.titre}</span>
              <span className="block mt-1"><span className="groovy text-3xl text-vin">{x.prix}</span> <span className="text-sm text-sourdine">{x.rythme}</span></span>
              <span className="block mt-1 text-xs text-sourdine">{x.note}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {erreur && <p className="mt-3 text-sm text-alerte" role="alert">{erreur}</p>}
      <button type="button" disabled={envoi} className="bouton-or mt-5 w-full justify-center disabled:opacity-60" onClick={async () => {
        setEnvoi(true); setErreur(null);
        const r = await demarrerAbonnement(formule);
        setEnvoi(false);
        if (!r.ok) { setErreur(r.message); return; }
        setSecret(r.secret); setAbonnement(r.abonnement); setMontant(r.montant); setEtape("paiement");
      }}>
        <Ballon className="tourne w-6" />{envoi ? "Préparation…" : "Continuer vers le paiement"}
      </button>
    </div>
  );
}

function FormulairePaiement({ montant, abonnement, onSucces }: { montant: string; abonnement: string; onSucces: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [express, setExpress] = useState(false);

  const payer = async () => {
    if (!stripe || !elements) return;
    setEnvoi(true); setErreur(null);
    const retour = `${window.location.origin}/abonnement/bienvenue?abonnement=${abonnement}`;
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: retour }, redirect: "if_required" });
    if (error) { setErreur(error.message ?? "Le paiement n'a pas abouti."); setEnvoi(false); return; }
    await verifierAbonnement(abonnement);
    onSucces();
  };

  return (
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); payer(); }}>
      {/* paiement en un geste : Google Pay, Apple Pay, PayPal, Link, selon l'appareil */}
      <ExpressCheckoutElement
        options={{ buttonHeight: 48, buttonType: { googlePay: "subscribe", applePay: "subscribe", paypal: "pay" }, buttonTheme: { googlePay: "black", applePay: "black" } }}
        onReady={(e) => setExpress(!!e.availablePaymentMethods && Object.values(e.availablePaymentMethods).some(Boolean))}
        onConfirm={payer}
      />
      {express && <p className="my-4 flex items-center gap-3 text-xs text-sourdine before:h-px before:flex-1 before:bg-trait after:h-px after:flex-1 after:bg-trait">ou par carte</p>}
      <div className={express ? "" : "mt-2"}>
        <PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: false, radios: "if_multiple", spacedAccordionItems: true }, wallets: { googlePay: "never", applePay: "never" } }} />
      </div>
      {erreur && <p className="mt-3 text-sm text-alerte" role="alert">{erreur}</p>}
      <button disabled={!stripe || envoi} className="bouton-or mt-5 w-full justify-center disabled:opacity-60">
        <Ballon className="tourne w-6" />{envoi ? "Paiement en cours…" : `Payer ${montant} et devenir Supporter`}
      </button>
      <p className="mt-3 text-xs text-sourdine text-center">Paiement chiffré et sécurisé. Vos coordonnées bancaires ne sont jamais stockées par Ambiance Rugby.</p>
    </form>
  );
}
