import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { shopDb } from "@/lib/shop/admin";
import { euros } from "@/lib/shop/format";

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : "");
const VUES: [string, string][] = [["abonnements", "Factures d'abonnement"], ["avoirs", "Avoirs et remboursements"]];

export default async function FacturesPage({ searchParams }: PageProps<"/studio/boutique/factures">) {
  const sp = await searchParams;
  const vue = sp.vue === "avoirs" ? "avoirs" : "abonnements";
  const db = shopDb();
  const [{ data: factures }, { data: avoirs }] = await Promise.all([
    db.from("supporter_factures").select("id,numero,formule,montant_cents,client_nom,client_email,payee_le,mode_test").order("created_at", { ascending: false }).limit(200),
    db.from("avoirs").select("id,numero,source,facture_origine,montant_cents,motif,moyen,rembourse_le,mode_test,created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  const reel = (factures ?? []).filter((f) => !f.mode_test);
  const total = reel.reduce((s, f) => s + f.montant_cents, 0);
  const rembourse = (avoirs ?? []).filter((a) => !a.mode_test).reduce((s, a) => s + a.montant_cents, 0);
  const kpis = [["Factures émises", String(reel.length)], ["Encaissé (abonnements)", euros(total)], ["Avoirs émis", String((avoirs ?? []).filter((a) => !a.mode_test).length)], ["Total remboursé", euros(rembourse)]];
  return (
    <div>
      <PageHeader titre="Factures et avoirs" description="Le registre comptable : factures des abonnements Supporter et avoirs émis lors des remboursements. Les lignes en mode test sont signalées et exclues des totaux." />
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(([k, v]) => <div key={k} className="bg-surface border border-trait rounded-2xl p-4"><dt className="text-sm text-sourdine">{k}</dt><dd className="titre text-3xl font-extrabold tnum">{v}</dd></div>)}
      </dl>
      <nav aria-label="Vue" className="flex flex-wrap gap-1 mb-4">
        {VUES.map(([v, l]) => (
          <Link key={v} href={`/studio/boutique/factures?vue=${v}`} aria-current={vue === v ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${vue === v ? "bg-vin text-white" : "bg-surface border border-trait hover:border-vin"}`}>{l}</Link>
        ))}
      </nav>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        {vue === "abonnements" ? (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-sourdine border-b border-trait text-left"><th scope="col" className="font-semibold px-4 py-2.5">Numéro</th><th scope="col" className="font-semibold px-3">Client</th><th scope="col" className="font-semibold px-3">Formule</th><th scope="col" className="font-semibold px-3">Payée le</th><th scope="col" className="font-semibold px-4 text-right">Montant</th></tr></thead>
            <tbody>
              {(factures ?? []).map((f) => (
                <tr key={f.id} className="border-b border-trait last:border-0">
                  <th scope="row" className="text-left px-4 py-2.5 font-semibold">{f.numero}{f.mode_test && <span className="ml-2 text-xs rounded-full bg-teinte px-2 py-0.5">test</span>}</th>
                  <td className="px-3">{f.client_nom}<span className="block text-xs text-sourdine">{f.client_email}</span></td>
                  <td className="px-3">{f.formule}</td><td className="px-3">{jour(f.payee_le)}</td><td className="px-4 text-right tnum font-semibold">{euros(f.montant_cents)}</td>
                </tr>
              ))}
              {!(factures ?? []).length && <tr><td colSpan={5} className="px-4 py-8 text-sourdine">Aucune facture pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-sourdine border-b border-trait text-left"><th scope="col" className="font-semibold px-4 py-2.5">Numéro</th><th scope="col" className="font-semibold px-3">Origine</th><th scope="col" className="font-semibold px-3">Motif</th><th scope="col" className="font-semibold px-3">Remboursé le</th><th scope="col" className="font-semibold px-4 text-right">Montant</th></tr></thead>
            <tbody>
              {(avoirs ?? []).map((a) => (
                <tr key={a.id} className="border-b border-trait last:border-0">
                  <th scope="row" className="text-left px-4 py-2.5 font-semibold">{a.numero}{a.mode_test && <span className="ml-2 text-xs rounded-full bg-teinte px-2 py-0.5">test</span>}</th>
                  <td className="px-3">{a.source === "boutique" ? "Boutique" : "Abonnement"}<span className="block text-xs text-sourdine">{a.facture_origine}</span></td>
                  <td className="px-3">{a.motif}</td><td className="px-3">{jour(a.rembourse_le ?? a.created_at)}</td><td className="px-4 text-right tnum font-semibold">{euros(a.montant_cents)}</td>
                </tr>
              ))}
              {!(avoirs ?? []).length && <tr><td colSpan={5} className="px-4 py-8 text-sourdine">Aucun avoir émis.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
