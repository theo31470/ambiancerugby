import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import SuiviTerrain from "@/components/shop/SuiviTerrain";
import { STATUTS, type Commande } from "@/lib/shop/admin";
import { euros, PAYS } from "@/lib/shop/format";
import { changerStatut, noteCommande, relancerPrintful, rembourser } from "../../actions";

export default async function AdminCommande({ params, searchParams }: PageProps<"/studio/boutique/commandes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const viewer = await getViewer();
  const [{ data }, { data: ev }] = await Promise.all([
    db.from("shop_orders").select("*").eq("id", id).maybeSingle(),
    db.from("shop_order_events").select("statut,message,created_at").eq("order_id", id).order("created_at"),
  ]);
  if (!data) notFound();
  const c = data as Commande & { note_interne: string | null };
  const back = `/studio/boutique/commandes/${id}`;
  const etapes = (ev ?? []).map((e) => ({ statut: e.statut, message: e.message, date: e.created_at }));
  return (
    <div>
      <Link href="/studio/boutique" className="text-sm text-sourdine underline underline-offset-4">Toutes les commandes</Link>
      <div className="mt-2">
        <PageHeader titre={`Commande ${c.numero}`} description={`${STATUTS[c.statut]}${c.mode_test ? " · commande de test" : ""} · ${euros(c.total_cents)} · ${c.email}`}
          actions={<>
            <Link href={`/suivi/${c.numero}?e=${encodeURIComponent(c.email)}`} className="bouton-discret">Page de suivi client</Link>
            {c.facture_numero && <Link href={`/boutique/facture/${c.numero}?e=${encodeURIComponent(c.email)}`} className="bouton-discret">Facture {c.facture_numero}</Link>}
          </>} />
      </div>
      <Notice sp={sp} />
      <SuiviTerrain c={c} etapes={etapes} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-3">Contenu et livraison</h2>
          <ul className="grid gap-1.5 text-sm">
            {c.items.map((i) => <li key={i.variant_id} className="flex justify-between gap-3"><span>{i.quantite} × {i.nom} <span className="text-sourdine">({i.detail})</span></span><span className="tnum">{euros(i.prix_cents * i.quantite)}</span></li>)}
            <li className="flex justify-between text-sourdine"><span>Livraison ({c.livraison_methode})</span><span className="tnum">{euros(c.livraison_cents)}</span></li>
            <li className="flex justify-between font-bold border-t border-trait pt-2"><span>Total</span><span className="tnum">{euros(c.total_cents)}</span></li>
          </ul>
          <p className="mt-4 text-sm whitespace-pre-line">{[c.livraison_nom, c.livraison_adresse1, c.livraison_adresse2, `${c.livraison_cp} ${c.livraison_ville}`, PAYS[c.livraison_pays ?? ""] ?? c.livraison_pays, c.livraison_tel].filter(Boolean).join("\n")}</p>
          <p className="mt-3 text-xs text-sourdine">Printful : {c.printful_order_id ? `commande n° ${c.printful_order_id}` : "pas encore transmise"}</p>
        </section>

        <section className="grid gap-4 content-start">
          <div className="bg-surface border border-trait rounded-2xl p-5">
            <h2 className="font-bold text-lg">Actions</h2>
            <form action={changerStatut} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
              <select name="statut" aria-label="Nouveau statut" className="champ" defaultValue="livree">
                <option value="en_fabrication">En fabrication</option><option value="expediee">Expédiée</option><option value="livree">Livrée</option>
                <option value="probleme">Problème</option><option value="annulee">Annulée</option>
              </select>
              <input name="message" placeholder="Message pour le fil (facultatif)" className="champ flex-1 min-w-48" />
              <button className="bouton-discret">Changer le statut</button>
            </form>
            <form action={relancerPrintful} className="mt-3">
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
              <button className="bouton-discret">{c.printful_order_id ? "Relire l'état chez Printful" : "Renvoyer à Printful"}</button>
            </form>
          </div>
          {viewer?.role === "admin" && c.stripe_session_id && !["remboursee", "en_attente"].includes(c.statut) && (
            <form action={rembourser} className="border-2 border-alerte/40 rounded-2xl p-5">
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
              <h2 className="font-bold text-lg text-alerte">Rembourser</h2>
              <p className="text-sm mt-1">Rembourse {euros(c.total_cents)} sur la carte du client. Pensez à annuler la commande chez Printful si elle n&apos;est pas encore fabriquée.</p>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="confirme" /> Je confirme le remboursement</label>
              <button className="mt-3 rounded-full bg-alerte text-white px-4 py-2 text-sm font-semibold">Rembourser la commande</button>
            </form>
          )}
          <form action={noteCommande} className="bg-surface border border-trait rounded-2xl p-5">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
            <label className="grid gap-1 font-bold">Note interne<textarea name="note" rows={3} defaultValue={c.note_interne ?? ""} className="champ font-normal" /></label>
            <button className="bouton-discret mt-2">Enregistrer la note</button>
          </form>
        </section>
      </div>
    </div>
  );
}
