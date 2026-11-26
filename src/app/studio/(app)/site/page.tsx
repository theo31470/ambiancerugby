import { redirect } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import { getViewer } from "@/lib/supabase/server";
import { shopDb } from "@/lib/shop/admin";
import { fmtRelative } from "@/lib/format";
import { FACEBOOK, INSTAGRAM } from "@/lib/reseaux";
import { SITE } from "@/lib/seo";

export const metadata = { title: "Site et santé" };

/** Clés nécessaires au site : seule leur présence est testée, jamais leur valeur. */
const SERVICES: { nom: string; role: string; cles: string[] }[] = [
  { nom: "Base de données", role: "Supabase : membres, matchs, boutique", cles: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
  { nom: "Paiements", role: "Stripe : abonnements Supporter et boutique", cles: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { nom: "Fabrication", role: "Printful : impression et envoi des commandes", cles: ["PRINTFUL_API_KEY", "PRINTFUL_STORE_ID"] },
  { nom: "E-mails", role: "Resend : factures, confirmations, SAV", cles: ["RESEND_API_KEY", "EMAIL_FROM"] },
  { nom: "Alertes téléphone", role: "Notifications push", cles: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"] },
  { nom: "Claude", role: "Aide à la saisie et à la rédaction", cles: ["ANTHROPIC_API_KEY"] },
];

const LIENS: [string, string, string][] = [
  ["Google Search Console", "Indexation et recherches Google", "https://search.google.com/search-console?resource_id=sc-domain:ambiance-rugby.fr"],
  ["Vercel", "Déploiements, facture, journaux", "https://vercel.com/dashboard"],
  ["Supabase", "Base de données et tâches planifiées", "https://supabase.com/dashboard/project/wsgetpnrloqrsvootoml"],
  ["Stripe", "Paiements, remboursements", "https://dashboard.stripe.com"],
  ["Printful", "Production et expéditions", "https://www.printful.com/dashboard"],
  ["Resend", "Envoi des e-mails", "https://resend.com/emails"],
  ["Instagram", "Compte du site", INSTAGRAM],
  ["Facebook", "Page du site", FACEBOOK],
];

export default async function SitePage() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") redirect("/studio");
  const { data: taches } = await shopDb().rpc("studio_taches");
  const t = (taches ?? []) as { nom: string; horaire: string; actif: boolean; derniere: string | null; statut: string | null; message: string | null }[];
  const enErreur = t.filter((x) => x.actif && x.statut === "failed");
  return (
    <div className="grid gap-10">
      <PageHeader titre="Site et santé" description={<>Ce qui fait tourner <a href={SITE} target="_blank" rel="noopener" className="underline underline-offset-4">{SITE.replace("https://", "")}</a> : services connectés, tâches automatiques et accès utiles. Réservé aux administrateurs.</>} />

      <section aria-labelledby="h-serv">
        <h2 id="h-serv" className="text-xl font-bold mb-3">Services connectés</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((s) => {
            const manque = s.cles.filter((c) => !process.env[c]);
            return (
              <li key={s.nom} className={`bg-surface border rounded-2xl p-4 ${manque.length ? "border-alerte" : "border-trait"}`}>
                <p className="flex items-center gap-2 font-semibold"><span className={`w-2.5 h-2.5 rounded-full ${manque.length ? "bg-alerte" : "bg-ok"}`} aria-hidden />{s.nom}<span className="sr-only">{manque.length ? " : configuration incomplète" : " : en place"}</span></p>
                <p className="text-sm text-sourdine mt-1">{s.role}</p>
                {manque.length > 0 && <p className="text-xs text-alerte mt-2">Manque sur Vercel : {manque.join(", ")}</p>}
              </li>
            );
          })}
        </ul>
        {(process.env.FEUILLES_PAUSE || process.env.VISUELS_DEMO) && <p className="mt-3 text-sm rounded-lg bg-moutarde/20 px-4 py-2">Attention : un mode pause ou démo est actif sur Vercel (FEUILLES_PAUSE ou VISUELS_DEMO).</p>}
      </section>

      <section aria-labelledby="h-crons">
        <h2 id="h-crons" className="text-xl font-bold mb-1">Tâches automatiques</h2>
        <p className="text-sm text-sourdine mb-3">{enErreur.length ? `${enErreur.length} en échec à leur dernier passage.` : "Toutes ont réussi à leur dernier passage."}</p>
        <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-sourdine border-b border-trait text-left"><th scope="col" className="font-semibold px-4 py-2.5">Tâche</th><th scope="col" className="font-semibold px-3">Fréquence</th><th scope="col" className="font-semibold px-3">Dernier passage</th><th scope="col" className="font-semibold px-4">Résultat</th></tr></thead>
            <tbody>
              {t.map((x) => (
                <tr key={x.nom} className={`border-b border-trait last:border-0 ${x.actif ? "" : "text-sourdine"}`}>
                  <th scope="row" className="text-left px-4 py-2.5 font-semibold">{x.nom}{!x.actif && <span className="ml-2 text-xs font-normal">désactivée</span>}</th>
                  <td className="px-3 font-mono text-xs">{x.horaire}</td>
                  <td className="px-3">{x.derniere ? fmtRelative(x.derniere) : "jamais"}</td>
                  <td className="px-4">{x.statut === "failed" ? <span className="text-alerte font-semibold">Échec<span className="block text-xs font-normal">{x.message}</span></span> : x.statut ? <span className="text-ok font-semibold">Réussie</span> : "–"}</td>
                </tr>
              ))}
              {!t.length && <tr><td colSpan={4} className="px-4 py-8 text-sourdine">Liste indisponible.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="h-liens">
        <h2 id="h-liens" className="text-xl font-bold mb-3">Accès rapides</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LIENS.map(([nom, detail, href]) => (
            <li key={nom}><a href={href} target="_blank" rel="noopener noreferrer" className="block h-full bg-surface border border-trait rounded-2xl p-4 hover:border-vin carte-vie"><span className="font-semibold block">{nom} ↗</span><span className="text-sm text-sourdine">{detail}</span></a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
