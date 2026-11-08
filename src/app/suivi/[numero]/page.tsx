import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SuiviTerrain from "@/components/shop/SuiviTerrain";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { euros } from "@/lib/shop/format";
import { STATUTS } from "@/lib/shop/admin";

export const metadata: Metadata = { title: "Suivi de commande", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SuiviCommande({ params, searchParams }: PageProps<"/suivi/[numero]">) {
  const { numero } = await params;
  const sp = await searchParams;
  const email = typeof sp.e === "string" ? sp.e : null;
  const r = await lireCommandeVisiteur(decodeURIComponent(numero), email);
  if (!r) redirect("/suivi?introuvable=1");
  const { commande: c, etapes } = r;
  const q = email ? `?e=${encodeURIComponent(email)}` : "";
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mb-6">
        <h1 className="groovy text-4xl sm:text-5xl text-vin">Commande {c.numero}</h1>
        <span className="text-sm font-bold rounded-full bg-teinte px-3 py-1">{STATUTS[c.statut]}</span>
        {c.mode_test && <span className="text-sm font-bold rounded-full bg-moutarde/30 px-3 py-1">Commande de test</span>}
      </div>
      <SuiviTerrain c={c} etapes={etapes} />
      <section aria-labelledby="h-contenu" className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <h2 id="h-contenu" className="font-bold text-lg mb-3">Contenu</h2>
          <ul className="grid gap-1.5 text-sm">
            {c.items.map((i) => <li key={i.variant_id} className="flex justify-between gap-3"><span>{i.quantite} × {i.nom} <span className="text-sourdine">({i.detail})</span></span><span className="tnum">{euros(i.prix_cents * i.quantite)}</span></li>)}
            <li className="flex justify-between gap-3 text-sourdine"><span>Livraison</span><span className="tnum">{euros(c.livraison_cents)}</span></li>
            <li className="flex justify-between gap-3 font-bold pt-2 border-t border-trait"><span>Total</span><span className="tnum">{euros(c.total_cents)}</span></li>
          </ul>
        </div>
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-3">Livraison</h2>
          <p className="text-sm whitespace-pre-line">{[c.livraison_nom, c.livraison_adresse1, c.livraison_adresse2, `${c.livraison_cp} ${c.livraison_ville}`, c.livraison_pays].filter(Boolean).join("\n")}</p>
          {c.facture_numero && <Link href={`/boutique/facture/${c.numero}${q}`} className="bouton-discret mt-4">Télécharger la facture {c.facture_numero}</Link>}
        </div>
      </section>
    </div>
  );
}
