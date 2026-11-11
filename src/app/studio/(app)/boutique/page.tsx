import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { STATUTS, type Commande, type Statut } from "@/lib/shop/admin";
import { euros } from "@/lib/shop/format";
import { isoFromNow } from "@/lib/format";

const COULEUR: Record<Statut, string> = {
  en_attente: "bg-teinte text-sourdine", payee: "bg-moutarde/30 text-encre", en_fabrication: "bg-moutarde/30 text-encre", expediee: "bg-vin/10 text-vin",
  livree: "bg-ok/15 text-ok", annulee: "bg-teinte text-sourdine", remboursee: "bg-teinte text-sourdine", probleme: "bg-alerte/15 text-alerte",
};

export default async function AdminCommandes({ searchParams }: PageProps<"/studio/boutique">) {
  const sp = await searchParams;
  const statut = typeof sp.statut === "string" ? sp.statut : "";
  const db = await createClient();
  let req = db.from("shop_orders").select("id,numero,email,livraison_nom,statut,total_cents,created_at,mode_test,items").order("created_at", { ascending: false }).limit(200);
  if (statut === "a-traiter") req = req.in("statut", ["payee", "probleme"]);
  else if (statut) req = req.eq("statut", statut);
  else req = req.neq("statut", "en_attente");
  const [{ data }, { data: mois }] = await Promise.all([
    req,
    db.from("shop_orders").select("total_cents,statut,mode_test").gte("created_at", isoFromNow(-30 * 86400e3)).in("statut", ["payee", "en_fabrication", "expediee", "livree"]),
  ]);
  const commandes = (data ?? []) as Pick<Commande, "id" | "numero" | "email" | "livraison_nom" | "statut" | "total_cents" | "created_at" | "mode_test" | "items">[];
  const reel = (mois ?? []).filter((m) => !m.mode_test);
  const kpis = [
    ["Ventes sur 30 jours", euros(reel.reduce((s, m) => s + m.total_cents, 0))],
    ["Commandes sur 30 jours", String(reel.length)],
    ["À traiter", String(commandes.filter((c) => c.statut === "payee" || c.statut === "probleme").length)],
  ];
  return (
    <div>
      <PageHeader titre="Commandes" description="Les commandes payées partent seules chez Printful et le suivi revient seul. Ici, vous surveillez, corrigez et remboursez."
        actions={<><Link href="/studio/boutique/produits" className="bouton-discret">Produits</Link><Link href="/studio/boutique/reglages" className="bouton-discret">Réglages</Link></>} />
      <Notice sp={sp} />
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {kpis.map(([k, v]) => <div key={k} className="bg-surface border border-trait rounded-2xl p-4"><dt className="text-sm text-sourdine">{k}</dt><dd className="titre text-3xl font-extrabold tnum">{v}</dd></div>)}
      </dl>
      <nav aria-label="Filtrer" className="flex flex-wrap gap-1 mb-4">
        {[["", "Toutes"], ["a-traiter", "À traiter"], ["en_fabrication", "En fabrication"], ["expediee", "Expédiées"], ["livree", "Livrées"], ["probleme", "Problèmes"], ["remboursee", "Remboursées"]].map(([v, l]) => (
          <Link key={v} href={v ? `/studio/boutique?statut=${v}` : "/studio/boutique"} aria-current={statut === v ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${statut === v ? "bg-vin text-white" : "bg-surface border border-trait hover:border-vin"}`}>{l}</Link>
        ))}
      </nav>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
            <th scope="col" className="font-semibold px-4 py-2.5">Commande</th><th scope="col" className="font-semibold px-3">Client</th>
            <th scope="col" className="font-semibold px-3">Date</th><th scope="col" className="font-semibold px-3 text-right">Total</th><th scope="col" className="font-semibold px-3">Statut</th>
          </tr></thead>
          <tbody>
            {commandes.map((c) => (
              <tr key={c.id} className="border-b border-trait last:border-0 hover:bg-teinte/60">
                <th scope="row" className="text-left px-4 py-2.5"><Link href={`/studio/boutique/commandes/${c.id}`} className="font-semibold hover:underline underline-offset-4">{c.numero}</Link>
                  {c.mode_test && <span className="ml-2 text-[10px] font-bold rounded-full bg-moutarde/30 px-1.5 py-0.5">test</span>}
                  <span className="block text-xs text-sourdine font-normal">{c.items.reduce((s, i) => s + i.quantite, 0)} article(s)</span></th>
                <td className="px-3">{c.livraison_nom}<span className="block text-xs text-sourdine">{c.email}</span></td>
                <td className="px-3 text-sourdine whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</td>
                <td className="px-3 text-right tnum font-semibold">{euros(c.total_cents)}</td>
                <td className="px-3"><span className={`text-xs font-bold rounded-full px-2 py-0.5 ${COULEUR[c.statut]}`}>{STATUTS[c.statut]}</span></td>
              </tr>
            ))}
            {!commandes.length && <tr><td colSpan={5} className="px-4 py-8 text-sourdine">Aucune commande pour l&apos;instant.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
