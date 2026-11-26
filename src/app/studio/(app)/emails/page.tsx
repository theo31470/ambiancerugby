import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { shopDb } from "@/lib/shop/admin";
import { fmtRelative, isoFromNow } from "@/lib/format";

const FILTRES: [string, string][] = [["tous", "Tous"], ["erreurs", "En erreur"]];

export default async function EmailsPage({ searchParams }: PageProps<"/studio/emails">) {
  const sp = await searchParams;
  const vue = sp.vue === "erreurs" ? "erreurs" : "tous";
  const db = shopDb();
  let req = db.from("email_log").select("id,created_at,to_email,kind,template,subject,status,error").order("created_at", { ascending: false }).limit(150);
  if (vue === "erreurs") req = req.not("error", "is", null);
  const [{ data }, { data: sem }] = await Promise.all([req, db.from("email_log").select("status,error").gte("created_at", isoFromNow(-7 * 86400e3))]);
  const envoyes = (sem ?? []).length;
  const erreurs = (sem ?? []).filter((e) => e.error).length;
  return (
    <div>
      <PageHeader titre="Journal des e-mails" description="Tout ce que le site envoie : confirmations de commande, factures, réponses SAV, e-mails d'abonnement. Un e-mail en erreur n'est pas parti : vérifiez l'adresse ou la clé d'envoi." />
      <dl className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="bg-surface border border-trait rounded-2xl p-4"><dt className="text-sm text-sourdine">Envoyés, 7 jours</dt><dd className="titre text-3xl font-extrabold tnum">{envoyes}</dd></div>
        <div className={`bg-surface border rounded-2xl p-4 ${erreurs ? "border-alerte" : "border-trait"}`}><dt className="text-sm text-sourdine">En erreur</dt><dd className={`titre text-3xl font-extrabold tnum ${erreurs ? "text-alerte" : ""}`}>{erreurs}</dd></div>
      </dl>
      <nav aria-label="Filtrer" className="flex flex-wrap gap-1 mb-4">
        {FILTRES.map(([v, l]) => (
          <Link key={v} href={`/studio/emails?vue=${v}`} aria-current={vue === v ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${vue === v ? "bg-vin text-white" : "bg-surface border border-trait hover:border-vin"}`}>{l}</Link>
        ))}
      </nav>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-sourdine border-b border-trait text-left"><th scope="col" className="font-semibold px-4 py-2.5">Date</th><th scope="col" className="font-semibold px-3">Destinataire</th><th scope="col" className="font-semibold px-3">Objet</th><th scope="col" className="font-semibold px-4">État</th></tr></thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id} className="border-b border-trait last:border-0 align-top">
                <td className="px-4 py-2.5 whitespace-nowrap text-sourdine">{fmtRelative(e.created_at)}</td>
                <td className="px-3">{e.to_email}</td>
                <td className="px-3">{e.subject}<span className="block text-xs text-sourdine">{e.template ?? e.kind}</span></td>
                <td className="px-4">{e.error ? <span className="text-alerte font-semibold">Erreur<span className="block text-xs font-normal">{e.error}</span></span> : <span className="text-ok font-semibold">Parti</span>}</td>
              </tr>
            ))}
            {!(data ?? []).length && <tr><td colSpan={4} className="px-4 py-8 text-sourdine">{vue === "erreurs" ? "Aucun e-mail en erreur." : "Aucun e-mail envoyé pour l'instant."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
