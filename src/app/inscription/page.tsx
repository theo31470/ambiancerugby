import Link from "next/link";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="groovy text-5xl text-vin">Créer un compte</h1>
      <p className="mt-2 text-sourdine">Gratuit. Mettez vos clubs et joueurs en favoris et participez aux discussions.</p>
      <div className="mt-6"><AuthForm mode="signup" /></div>
      <p className="mt-6 text-sm">
        Déjà inscrit ? <Link href="/connexion" className="text-vin font-semibold underline underline-offset-4">Se connecter</Link>
      </p>
    </div>
  );
}
