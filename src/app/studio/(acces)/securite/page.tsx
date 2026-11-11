import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DoubleAuth from "@/components/studio/DoubleAuth";
import { quitterStudio } from "../actions";

export const metadata: Metadata = { title: "Vérification" };
export const dynamic = "force-dynamic";

/** Second facteur : activation (première fois) ou saisie du code à 6 chiffres. */
export default async function Securite({ searchParams }: PageProps<"/studio/securite">) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" && sp.suite.startsWith("/studio") ? sp.suite : "/studio";
  const db = await createClient();
  const { data: c } = await db.auth.getClaims();
  if (!c?.claims) redirect("/studio/connexion");
  const { data: p } = await db.from("profiles").select("role, display_name").eq("id", c.claims.sub).single();
  if (!p || p.role === "user") {
    return (
      <>
        <h1 className="titre text-2xl font-extrabold">Accès refusé</h1>
        <p className="text-sm text-sourdine mt-2">Ce compte n&apos;a pas accès au studio.</p>
        <form action={quitterStudio} className="mt-4"><button className="bouton-discret">Changer de compte</button></form>
      </>
    );
  }
  if (c.claims.aal === "aal2") redirect(suite);
  const { data: facteurs } = await db.auth.mfa.listFactors();
  const totp = (facteurs?.totp ?? []).find((f) => f.status === "verified");
  return (
    <>
      <h1 className="titre text-2xl font-extrabold">{totp ? "Code de vérification" : "Activer la double authentification"}</h1>
      <p className="text-sm text-sourdine mt-1">
        {totp ? `Bonjour ${p.display_name ?? ""}. Saisissez le code à 6 chiffres affiché par votre application.`
          : "Obligatoire pour entrer au studio. Scannez le QR code avec Google Authenticator, 1Password ou Microsoft Authenticator, puis saisissez le code affiché."}
      </p>
      <DoubleAuth facteur={totp?.id ?? null} suite={suite} />
      <form action={quitterStudio} className="mt-5 text-center"><button className="text-xs text-sourdine underline underline-offset-4">Se déconnecter</button></form>
    </>
  );
}
