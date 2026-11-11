import type { Metadata } from "next";
import FormConnexion from "@/components/studio/FormConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionStudio({ searchParams }: PageProps<"/studio/connexion">) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="titre text-2xl font-extrabold">Connexion</h1>
      <p className="text-sm text-sourdine mt-1">Puis code à 6 chiffres de votre application d&apos;authentification.</p>
      <FormConnexion suite={typeof sp.suite === "string" ? sp.suite : "/studio"} />
    </>
  );
}
