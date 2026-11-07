import Link from "next/link";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" ? sp.suite : undefined;
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-3xl font-extrabold">Connexion</h1>
      <p className="mt-2 text-sourdine">Suivez vos clubs et commentez les matchs.</p>
      {sp.erreur && <p role="alert" className="mt-4 text-sm text-alerte">Le lien a expiré ou a déjà servi. Connectez-vous avec votre mot de passe.</p>}
      <div className="mt-6"><AuthForm mode="signin" suite={suite} /></div>
      <p className="mt-6 text-sm">
        Pas encore de compte ? <Link href="/inscription" className="text-vin font-semibold underline underline-offset-4">Créer un compte</Link>
      </p>
    </div>
  );
}
