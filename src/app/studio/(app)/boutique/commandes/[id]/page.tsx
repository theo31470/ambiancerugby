import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import SuiviTerrain from "@/components/shop/SuiviTerrain";
import { STATUTS, type Commande } from "@/lib/shop/admin";
import { euros, PAYS } from "@/lib/shop/format";
import { changerStatut, noteCommande, relancerPrintful, rembourser, repondreSav } from "../../actions";
import { shopDb } from "@/lib/shop/admin";
import { MOTIFS_SAV, SOUHAITS, STATUTS_SAV, type MotifSav } from "@/lib/shop/sav";

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
  // demandes de SAV et leurs photos (stockage privé : liens signés valables une heure)
  const { data: savs } = await db.from("shop_sav").select("*").eq("order_id", id).order("created_at", { ascending: false });
  const chemins = (savs ?? []).flatMap((d) => d.photos as string[]);
  const { data: signes } = chemins.length ? await shopDb().storage.from("sav").createSignedUrls(chemins, 3600) : { data: [] };
  const urlDe = new Map((signes ?? []).map((x) => [x.path, x.signedUrl]));
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
            {(c.remise_cents ?? 0) > 0 && <li className="flex justify-between gap-3 text-sourdine"><span>Remise{c.code_promo ? ` (code ${c.code_promo})` : ""}</span><span className="tnum">−{euros(c.remise_cents ?? 0)}</span></li>}
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
          {viewer?.role === "admin" && (c.stripe_session_id || (c as { stripe_payment_intent?: string | null }).stripe_payment_intent) && !["remboursee", "en_attente"].includes(c.statut) && (
            <form action={rembourser} className="border-2 border-alerte/40 rounded-2xl p-5">
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
              <h2 className="font-bold text-lg text-alerte">Rembourser</h2>
              <p className="text-sm mt-1">Rembourse sur la carte du client : tout ({euros(c.total_cents)}) ou seulement un montant (retour d&apos;un article, geste commercial). Un avoir est émis et envoyé automatiquement. Pensez à annuler chez Printful si rien n&apos;est encore fabriqué.</p>
              <label className="mt-3 grid gap-1 text-sm font-semibold max-w-60">Montant à rembourser (€)<input name="montant" type="number" step="0.01" min="0.5" max={(c.total_cents / 100).toFixed(2)} placeholder={`${(c.total_cents / 100).toFixed(2)} (tout)`} className="champ font-normal" /></label>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="confirme" /> Je confirme le remboursement</label>
              <button className="mt-3 rounded-full bg-alerte text-white px-4 py-2 text-sm font-semibold">Rembourser</button>
            </form>
          )}
          <form action={noteCommande} className="bg-surface border border-trait rounded-2xl p-5">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={back} />
            <label className="grid gap-1 font-bold">Note interne<textarea name="note" rows={3} defaultValue={c.note_interne ?? ""} className="champ font-normal" /></label>
            <button className="bouton-discret mt-2">Enregistrer la note</button>
          </form>
        </section>
      </div>

      <section id="sav" className="mt-8 scroll-mt-24">
        <h2 className="font-bold text-lg mb-3">Service après-vente</h2>
        {!(savs ?? []).length ? <p className="text-sm text-sourdine">Aucune demande sur cette commande.</p> : (
          <ul className="grid gap-4">
            {(savs ?? []).map((d) => (
              <li key={d.id} className={`bg-surface border-2 rounded-2xl p-5 ${["ouverte", "en_cours"].includes(d.statut) ? "border-moutarde" : "border-trait"}`}>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{d.numero}</span>
                  <span className="text-sm">{MOTIFS_SAV[d.motif as MotifSav]?.titre ?? d.motif}{d.souhait ? `, souhaite : ${(SOUHAITS[d.souhait] ?? d.souhait).toLowerCase()}` : ""}</span>
                  <span className="ml-auto text-xs font-bold rounded-full bg-teinte px-2.5 py-1">{STATUTS_SAV[d.statut]}</span>
                </p>
                <p className="text-xs text-sourdine mt-1">{new Date(d.created_at).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</p>
                {(d.articles as { nom: string; detail: string; quantite: number }[]).length > 0 && (
                  <p className="mt-2 text-sm">{(d.articles as { nom: string; detail: string; quantite: number }[]).map((a) => `${a.quantite} × ${a.nom} (${a.detail})`).join(", ")}</p>
                )}
                <p className="mt-2 whitespace-pre-line">{d.message}</p>
                {(d.photos as string[]).length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(d.photos as string[]).map((ph) => urlDe.get(ph) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <li key={ph}><a href={urlDe.get(ph)!} target="_blank" rel="noopener noreferrer"><img src={urlDe.get(ph)!} alt="Photo jointe par le client" className="w-28 h-28 rounded-xl object-cover border border-trait" /></a></li>
                    ))}
                  </ul>
                )}
                <form action={repondreSav} className="mt-4 grid gap-2">
                  <input type="hidden" name="id" value={d.id} /><input type="hidden" name="_back" value={`${back}#sav`} />
                  <textarea name="reponse" rows={3} defaultValue={d.reponse ?? ""} className="champ" aria-label="Réponse au client"
                    placeholder="Ex. : Retour accepté. Renvoyez l'article à l'adresse ci-dessous ; le remboursement part dès réception." />
                  <div className="flex flex-wrap items-center gap-3">
                    <select name="statut" defaultValue={d.statut === "ouverte" ? "en_cours" : d.statut} className="champ w-auto" aria-label="Statut de la demande">
                      {Object.entries(STATUTS_SAV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="prevenir" defaultChecked /> Envoyer la réponse au client par e-mail</label>
                    <button className="bouton-discret ml-auto">Enregistrer</button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
