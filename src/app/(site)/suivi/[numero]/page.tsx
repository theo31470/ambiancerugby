import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SuiviTerrain from "@/components/shop/SuiviTerrain";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { euros } from "@/lib/shop/format";
import { STATUTS, shopDb } from "@/lib/shop/admin";
import { MOTIFS_SAV, STATUTS_SAV, type MotifSav } from "@/lib/shop/sav";

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
  // accès déjà vérifié ci-dessus : on peut lire les avoirs de cette commande
  const { data: av } = await shopDb().from("avoirs").select("numero").eq("order_id", c.id).not("numero", "is", null);
  const avoirs = av ?? [];
  const { data: savs } = await shopDb().from("shop_sav").select("numero, motif, statut, reponse, created_at").eq("order_id", c.id).order("created_at", { ascending: false });
  const envoyee = sp.sav === "envoyee";
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
            {(c.remise_cents ?? 0) > 0 && <li className="flex justify-between gap-3 text-sourdine"><span>Remise{c.code_promo ? ` (code ${c.code_promo})` : ""}</span><span className="tnum">−{euros(c.remise_cents ?? 0)}</span></li>}
            <li className="flex justify-between gap-3 text-sourdine"><span>Livraison</span><span className="tnum">{euros(c.livraison_cents)}</span></li>
            <li className="flex justify-between gap-3 font-bold pt-2 border-t border-trait"><span>Total</span><span className="tnum">{euros(c.total_cents)}</span></li>
          </ul>
        </div>
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-3">Livraison</h2>
          <p className="text-sm whitespace-pre-line">{[c.livraison_nom, c.livraison_adresse1, c.livraison_adresse2, `${c.livraison_cp} ${c.livraison_ville}`, c.livraison_pays].filter(Boolean).join("\n")}</p>
          {c.facture_numero && <a href={`/factures/${encodeURIComponent(c.facture_numero)}${q}`} target="_blank" rel="noopener" className="bouton-discret mt-4">Télécharger la facture {c.facture_numero}</a>}
          {avoirs.map((a) => <a key={a.numero} href={`/factures/${encodeURIComponent(a.numero!)}${q}`} target="_blank" rel="noopener" className="bouton-discret mt-2">Télécharger l&apos;avoir {a.numero}</a>)}
        </div>
      </section>

      <section id="sav" aria-labelledby="h-sav" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="h-sav" className="groovy text-3xl text-vin">Besoin d&apos;aide ?</h2>
            <p className="mt-1 text-sourdine">Retour, article abîmé, colis qui n&apos;arrive pas : on s&apos;en occupe.</p>
          </div>
          <Link href={`/suivi/${encodeURIComponent(c.numero)}/sav${q}`} className="bouton-or">Faire une demande</Link>
        </div>
        {envoyee && <p role="status" className="mt-4 rounded-xl bg-ok/10 text-ok px-4 py-3 font-semibold">Demande envoyée. Une confirmation part par e-mail, nous revenons vers vous sous 48 heures ouvrées.</p>}
        {(savs ?? []).length > 0 && (
          <ul className="mt-5 grid gap-3">
            {(savs ?? []).map((d) => (
              <li key={d.numero} className="bg-surface border border-trait rounded-2xl p-4">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{d.numero}</span>
                  <span className="text-sm text-sourdine">{MOTIFS_SAV[d.motif as MotifSav]?.titre ?? d.motif}, le {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}</span>
                  <span className="ml-auto text-xs font-bold rounded-full bg-teinte px-2.5 py-1">{STATUTS_SAV[d.statut] ?? d.statut}</span>
                </p>
                {d.reponse && <p className="mt-2 text-sm whitespace-pre-line border-l-4 border-vin/30 pl-3">{d.reponse}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
