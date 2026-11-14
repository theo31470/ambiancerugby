import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { MOTIFS_SAV, SOUHAITS, motifsPossibles } from "@/lib/shop/sav";
import { envoyerSav } from "./actions";
import PhotosSav from "@/components/shop/PhotosSav";

export const metadata: Metadata = { title: "Service après-vente", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Formulaire de service après-vente : rétractation, défaut, erreur, colis non reçu. */
export default async function Sav({ params, searchParams }: PageProps<"/suivi/[numero]/sav">) {
  const { numero } = await params;
  const sp = await searchParams;
  const e = typeof sp.e === "string" ? sp.e : null;
  const r = await lireCommandeVisiteur(decodeURIComponent(numero), e);
  if (!r) redirect("/suivi?introuvable=1");
  const c = r.commande;
  const motifs = motifsPossibles(c);
  const q = e ? `?e=${encodeURIComponent(e)}` : "";
  const erreur = typeof sp.erreur === "string" ? sp.erreur : null;
  return (
    <div className="max-w-2xl">
      <Link href={`/suivi/${encodeURIComponent(c.numero)}${q}`} className="text-sm text-sourdine underline underline-offset-4">Commande {c.numero}</Link>
      <h1 className="groovy text-4xl sm:text-5xl text-vin mt-2">Un souci avec la commande ?</h1>
      <p className="mt-3 text-sourdine">Dites-nous ce qui se passe : nous répondons par e-mail sous 48 heures ouvrées.</p>
      {erreur && <p role="alert" className="mt-5 rounded-xl bg-alerte/10 text-alerte px-4 py-3 text-sm font-semibold">{erreur}</p>}

      <form action={envoyerSav} className="mt-8 grid gap-7">
        <input type="hidden" name="numero" value={c.numero} />
        {e && <input type="hidden" name="e" value={e} />}

        <fieldset className="grid gap-2">
          <legend className="font-bold text-lg mb-2">Que se passe-t-il ?</legend>
          {motifs.map((m, i) => (
            <label key={m} className="flex gap-3 items-start rounded-2xl border-2 border-trait bg-surface p-4 cursor-pointer has-[:checked]:border-vin has-[:checked]:bg-teinte transition-colors">
              <input type="radio" name="motif" value={m} required defaultChecked={i === 0} className="mt-1 accent-[var(--vin)]" />
              <span><span className="font-semibold">{MOTIFS_SAV[m].titre}</span><span className="block text-sm text-sourdine">{MOTIFS_SAV[m].detail}</span></span>
            </label>
          ))}
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="font-bold text-lg mb-2">Articles concernés</legend>
          {c.items.map((i) => (
            <label key={i.variant_id} className="flex items-center gap-3 rounded-xl bg-surface border border-trait px-4 py-3 cursor-pointer has-[:checked]:border-vin">
              <input type="checkbox" name="article" value={i.variant_id} defaultChecked={c.items.length === 1} className="accent-[var(--vin)] w-4 h-4" />
              <span>{i.quantite} × {i.nom} <span className="text-sourdine">({i.detail})</span></span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="souhait" className="font-bold text-lg">Ce que vous souhaitez</label>
          <select id="souhait" name="souhait" className="champ mt-2" defaultValue="remboursement">
            {Object.entries(SOUHAITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="font-bold text-lg">Votre message</label>
          <textarea id="message" name="message" required minLength={10} rows={5} className="champ mt-2" placeholder="Par exemple : le t-shirt taille L est trop petit, je voudrais un XL." />
        </div>

        <div>
          <label htmlFor="photos" className="font-bold text-lg">Photos</label>
          <p className="text-sm text-sourdine">Indispensables pour un défaut ou une erreur : jusqu&apos;à 4 photos.</p>
          <PhotosSav />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button className="bouton-or text-lg px-6 py-3">Envoyer la demande</button>
          <Link href="/boutique/aide#retours" className="text-sm text-vin underline underline-offset-4">Comment se passe un retour ?</Link>
        </div>
      </form>
    </div>
  );
}
