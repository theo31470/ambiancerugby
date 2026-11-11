"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { appliquerNouveauMoyen, preparerNouveauMoyen } from "@/app/(site)/abonnement/actions";

const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromesse = cle ? loadStripe(cle, { locale: "fr" }) : null;

/** Changer de carte (ou de moyen) dans la page, sans quitter le site. */
export default function ChangerMoyen() {
  const [secret, setSecret] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const options = useMemo<StripeElementsOptions | null>(() => (secret ? {
    clientSecret: secret, locale: "fr",
    appearance: { theme: "flat", variables: { colorPrimary: "#934f5e", colorText: "#2a1419", borderRadius: "14px", fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }, rules: { ".Input": { border: "2px solid #ecd9dd", boxShadow: "none" } } },
    fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&display=swap" }],
  } : null), [secret]);

  if (fait) return <p className="font-semibold text-ok">Nouveau moyen de paiement enregistré. Il servira dès la prochaine échéance.</p>;
  if (!secret || !options || !stripePromesse) {
    return (
      <div>
        <button type="button" className="bouton-discret" onClick={async () => {
          setErreur(null);
          const r = await preparerNouveauMoyen();
          if (r.ok) setSecret(r.secret); else setErreur(r.message);
        }}>Changer de moyen de paiement</button>
        {erreur && <p className="mt-2 text-sm text-alerte" role="alert">{erreur}</p>}
      </div>
    );
  }
  return <Elements stripe={stripePromesse} options={options}><Formulaire onFait={() => setFait(true)} /></Elements>;
}

function Formulaire({ onFait }: { onFait: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  return (
    <form className="max-w-md" onSubmit={async (e) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setEnvoi(true); setErreur(null);
      const { error, setupIntent } = await stripe.confirmSetup({ elements, confirmParams: { return_url: `${window.location.origin}/compte/abonnement` }, redirect: "if_required" });
      if (error || !setupIntent) { setErreur(error?.message ?? "Le moyen de paiement n'a pas été validé."); setEnvoi(false); return; }
      const r = await appliquerNouveauMoyen(setupIntent.id);
      setEnvoi(false);
      if (!r.ok) { setErreur(r.message); return; }
      onFait();
      router.refresh();
    }}>
      <PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: false, radios: "if_multiple", spacedAccordionItems: true } }} />
      {erreur && <p className="mt-2 text-sm text-alerte" role="alert">{erreur}</p>}
      <button disabled={!stripe || envoi} className="bouton-or mt-4">{envoi ? "Enregistrement…" : "Enregistrer ce moyen de paiement"}</button>
    </form>
  );
}
