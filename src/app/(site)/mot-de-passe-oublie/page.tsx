import Link from "next/link";
import type { Metadata } from "next";
import { DemandeReinitialisation } from "@/components/MotDePasseForms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function MotDePasseOublie({ searchParams }: PageProps<"/mot-de-passe-oublie">) {
  const sp = await searchParams;
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="groovy text-5xl text-vin">Mot de passe oublié</h1>
      <p className="mt-2 text-sourdine">Indiquez l&apos;adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      {sp.erreur && <p role="alert" className="mt-4 text-sm text-alerte">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.</p>}
      <div className="mt-6"><DemandeReinitialisation /></div>
      <p className="mt-6 text-sm"><Link href="/connexion" className="text-vin font-semibold underline underline-offset-4">Retour à la connexion</Link></p>
    </div>
  );
}
