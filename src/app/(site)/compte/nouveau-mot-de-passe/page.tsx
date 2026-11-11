import type { Metadata } from "next";
import { NouveauMotDePasse } from "@/components/MotDePasseForms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function NouveauMotDePassePage() {
  return (
    <div className="max-w-sm">
      <h2 className="titre text-2xl font-extrabold">Choisissez un nouveau mot de passe</h2>
      <p className="mt-1 text-sourdine">Vous êtes connecté grâce au lien reçu par e-mail.</p>
      <div className="mt-6"><NouveauMotDePasse /></div>
    </div>
  );
}
