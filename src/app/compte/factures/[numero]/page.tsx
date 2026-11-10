/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getViewer, publicClient } from "@/lib/supabase/server";
import BoutonImprimer from "@/components/shop/BoutonImprimer";

export const metadata: Metadata = { title: "Facture", robots: { index: false } };
export const dynamic = "force-dynamic";

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "–");
const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Facture d'une échéance Supporter, émise par Ambiance Rugby (imprimable, enregistrable en PDF). */
export default async function FactureSupporter({ params }: PageProps<"/compte/factures/[numero]">) {
  const { numero } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();
  const db = await createClient();
  const { data: f } = await db.from("supporter_factures").select("*").eq("numero", decodeURIComponent(numero)).maybeSingle();
  if (!f) notFound();
  const { data: v } = await publicClient().from("shop_settings").select("vendeur_nom,vendeur_adresse,vendeur_siret,vendeur_email,mention_tva").eq("id", 1).single();
  const libelle = f.formule === "annuel" ? "Abonnement Supporter, formule annuelle" : "Abonnement Supporter, formule mensuelle";

  return (
    <div className="max-w-3xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sourdine">Facture {f.numero}</p>
        <BoutonImprimer />
      </div>
      <article className="bg-white text-[#2a1419] rounded-2xl border border-trait p-8 sm:p-12 print:border-0 print:p-0 print:rounded-none" aria-label={`Facture ${f.numero}`}>
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="rounded-xl bg-[#934f5e] p-3 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
            <img src="/logo-blanc.png" alt="Ambiance Rugby" className="h-16 w-auto" />
          </div>
          <div className="text-right">
            <p className="titre text-3xl font-extrabold">Facture</p>
            <p className="font-semibold">{f.numero}</p>
            <p className="text-sm">Date : {jour(f.payee_le)}</p>
          </div>
        </header>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-[#6b5157]">Vendeur</p>
            <p className="mt-1 font-semibold">{v?.vendeur_nom ?? "Ambiance Rugby"}</p>
            {v?.vendeur_adresse && <p className="whitespace-pre-line">{v.vendeur_adresse}</p>}
            {v?.vendeur_siret && <p>SIRET : {v.vendeur_siret}</p>}
            {v?.vendeur_email && <p>{v.vendeur_email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b5157]">Client</p>
            <p className="mt-1 font-semibold">{f.client_nom ?? viewer.display_name ?? ""}</p>
            <p>{f.client_email ?? viewer.email}</p>
          </div>
        </div>
        <table className="mt-10 w-full text-sm tnum">
          <thead>
            <tr className="border-b-2 border-[#2a1419] text-left">
              <th scope="col" className="py-2 font-semibold">Désignation</th>
              <th scope="col" className="py-2 font-semibold">Période</th>
              <th scope="col" className="py-2 font-semibold text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e8dcdf]">
              <td className="py-2">{libelle}</td>
              <td className="py-2">{f.periode_debut ? `du ${jour(f.periode_debut)} au ${jour(f.periode_fin)}` : "–"}</td>
              <td className="py-2 text-right">{euros(f.montant_cents)}</td>
            </tr>
          </tbody>
        </table>
        <dl className="mt-6 ml-auto max-w-xs text-sm grid gap-1">
          <div className="flex justify-between"><dt>Total HT</dt><dd className="tnum">{euros(f.montant_cents)}</dd></div>
          <div className="flex justify-between"><dt>TVA</dt><dd className="tnum">{euros(0)}</dd></div>
          <div className="flex justify-between titre text-lg font-extrabold border-t-2 border-[#2a1419] pt-2 mt-1"><dt>Total TTC</dt><dd className="tnum">{euros(f.montant_cents)}</dd></div>
        </dl>
        <footer className="mt-12 text-xs text-[#6b5157] grid gap-1">
          <p className="font-semibold text-[#2a1419]">{v?.mention_tva ?? "TVA non applicable, art. 293 B du CGI"}</p>
          <p>Facture acquittée le {jour(f.payee_le)}.</p>
          {f.mode_test && <p className="font-semibold text-[#c0392b]">Paiement de test : ce document n&apos;a pas de valeur comptable.</p>}
        </footer>
      </article>
    </div>
  );
}
