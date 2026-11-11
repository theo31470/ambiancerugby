/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { publicClient } from "@/lib/supabase/server";
import { euros, PAYS } from "@/lib/shop/format";
import BoutonImprimer from "@/components/shop/BoutonImprimer";

export const metadata: Metadata = { title: "Facture", robots: { index: false } };
export const dynamic = "force-dynamic";

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "–");

export default async function Facture({ params, searchParams }: PageProps<"/boutique/facture/[numero]">) {
  const { numero } = await params;
  const sp = await searchParams;
  const r = await lireCommandeVisiteur(decodeURIComponent(numero), typeof sp.e === "string" ? sp.e : null);
  if (!r || !r.commande.facture_numero) notFound();
  const c = r.commande;
  const { data: v } = await publicClient().from("shop_settings").select("vendeur_nom,vendeur_adresse,vendeur_siret,vendeur_email,mention_tva").eq("id", 1).single();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sourdine">Facture {c.facture_numero}</p>
        <BoutonImprimer />
      </div>
      <article className="bg-white text-[#2a1419] rounded-2xl border border-trait p-8 sm:p-12 print:border-0 print:p-0 print:rounded-none" aria-label={`Facture ${c.facture_numero}`}>
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="rounded-xl bg-[#934f5e] p-3 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
            <img src="/logo-blanc.png" alt="Ambiance Rugby" className="h-16 w-auto" />
          </div>
          <div className="text-right">
            <p className="titre text-3xl font-extrabold">Facture</p>
            <p className="font-semibold">{c.facture_numero}</p>
            <p className="text-sm">Date : {jour(c.facture_date)}</p>
            <p className="text-sm">Commande : {c.numero}</p>
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
            <p className="mt-1 font-semibold">{c.livraison_nom}</p>
            <p className="whitespace-pre-line">{[c.livraison_adresse1, c.livraison_adresse2, `${c.livraison_cp} ${c.livraison_ville}`, PAYS[c.livraison_pays ?? ""] ?? c.livraison_pays].filter(Boolean).join("\n")}</p>
            <p>{c.email}</p>
          </div>
        </div>

        <table className="mt-10 w-full text-sm tnum">
          <thead>
            <tr className="border-b-2 border-[#2a1419] text-left">
              <th scope="col" className="py-2 font-semibold">Désignation</th>
              <th scope="col" className="py-2 font-semibold text-right">Qté</th>
              <th scope="col" className="py-2 font-semibold text-right">Prix unitaire</th>
              <th scope="col" className="py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((i) => (
              <tr key={i.variant_id} className="border-b border-[#e8dcdf]">
                <td className="py-2">{i.nom} <span className="text-[#6b5157]">({i.detail})</span></td>
                <td className="py-2 text-right">{i.quantite}</td>
                <td className="py-2 text-right">{euros(i.prix_cents)}</td>
                <td className="py-2 text-right">{euros(i.prix_cents * i.quantite)}</td>
              </tr>
            ))}
            <tr className="border-b border-[#e8dcdf]">
              <td className="py-2">Frais de livraison</td><td className="py-2 text-right">1</td>
              <td className="py-2 text-right">{euros(c.livraison_cents)}</td><td className="py-2 text-right">{euros(c.livraison_cents)}</td>
            </tr>
          </tbody>
        </table>
        <dl className="mt-6 ml-auto max-w-xs text-sm grid gap-1">
          <div className="flex justify-between"><dt>Total HT</dt><dd className="tnum">{euros(c.total_cents)}</dd></div>
          <div className="flex justify-between"><dt>TVA</dt><dd className="tnum">{euros(0)}</dd></div>
          <div className="flex justify-between titre text-lg font-extrabold border-t-2 border-[#2a1419] pt-2 mt-1"><dt>Total TTC</dt><dd className="tnum">{euros(c.total_cents)}</dd></div>
        </dl>

        <footer className="mt-12 text-xs text-[#6b5157] grid gap-1">
          <p className="font-semibold text-[#2a1419]">{v?.mention_tva ?? "TVA non applicable, art. 293 B du CGI"}</p>
          <p>Facture acquittée le {jour(c.paye_at)}, réglée par carte bancaire.</p>
          {c.mode_test && <p className="font-semibold text-[#c0392b]">Commande de test : ce document n&apos;a pas de valeur comptable.</p>}
        </footer>
      </article>
    </div>
  );
}
