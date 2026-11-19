import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: true } };

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" ? sp.suite : undefined;
  // déjà connecté : pas de raison de rester ici, on va où il voulait aller (ou sur son espace)
  if (await getViewer()) redirect(suite?.startsWith("/") && !suite.startsWith("//") && !suite.startsWith("/connexion") ? suite : "/moi");
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="groovy text-5xl text-vin">Connexion</h1>
      <p className="mt-2 text-sourdine">Suivez vos clubs et commentez les matchs.</p>
      {sp.erreur && <p role="alert" className="mt-4 text-sm text-alerte">Le lien a expiré ou a déjà servi. Connectez-vous avec votre mot de passe.</p>}
      <div className="mt-6"><AuthForm mode="signin" suite={suite} /></div>
      <p className="mt-6 text-sm">
        Pas encore de compte ? <Link href="/inscription" className="text-vin font-semibold underline underline-offset-4">Créer un compte</Link>
      </p>
    </div>
  );
}
