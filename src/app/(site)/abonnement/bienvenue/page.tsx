import Link from "next/link";
import type { Metadata } from "next";
import { Ballon } from "@/components/deco/Icones";
import { verifierAbonnement } from "../actions";

export const metadata: Metadata = { title: "Bienvenue en tribune", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Retour après un paiement qui passe par une autre page (PayPal, validation bancaire). */
export default async function Bienvenue({ searchParams }: PageProps<"/abonnement/bienvenue">) {
  const sp = await searchParams;
  const id = typeof sp.abonnement === "string" ? sp.abonnement : null;
  const echec = sp.redirect_status === "failed";
  const r = id && !echec ? await verifierAbonnement(id, false) : null;
  const ok = !!r && r.ok && r.actif;
  return (
    <div className="max-w-lg mx-auto text-center py-10">
      <Ballon className={`w-16 mx-auto text-vin ${ok ? "animate-bounce" : ""}`} />
      {ok ? (
        <>
          <h1 className="groovy text-5xl text-vin mt-4">Bienvenue en tribune !</h1>
          <p className="mt-3 text-sourdine">Vous êtes Supporter. Votre badge doré est actif et tout le site vous est ouvert.</p>
        </>
      ) : echec ? (
        <>
          <h1 className="groovy text-4xl text-vin mt-4">Le paiement n&apos;a pas abouti</h1>
          <p className="mt-3 text-sourdine">Aucun montant n&apos;a été prélevé. Vous pouvez réessayer, avec le même moyen ou un autre.</p>
        </>
      ) : (
        <>
          <h1 className="groovy text-4xl text-vin mt-4">Paiement en cours de validation</h1>
          <p className="mt-3 text-sourdine">Votre banque confirme le paiement. Votre badge s&apos;activera dans quelques instants ; rechargez cette page si besoin.</p>
        </>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {ok ? <Link href="/compte/abonnement" className="bouton-discret">Mon abonnement et mes factures</Link> : <Link href="/abonnement" className="bouton-discret">Revenir à l&apos;abonnement</Link>}
        <Link href="/" className="bouton-or">Retour au site</Link>
      </div>
    </div>
  );
}
