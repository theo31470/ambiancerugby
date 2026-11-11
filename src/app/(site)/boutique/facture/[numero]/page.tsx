import { notFound, redirect } from "next/navigation";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";

/** Ancienne adresse des factures boutique (par numéro de commande) : renvoie vers le PDF. */
export default async function Facture({ params, searchParams }: PageProps<"/boutique/facture/[numero]">) {
  const { numero } = await params;
  const sp = await searchParams;
  const e = typeof sp.e === "string" ? sp.e : null;
  const r = await lireCommandeVisiteur(decodeURIComponent(numero), e);
  if (!r?.commande.facture_numero) notFound();
  redirect(`/factures/${encodeURIComponent(r.commande.facture_numero)}${e ? `?e=${encodeURIComponent(e)}` : ""}`);
}
