import Link from "next/link";
import type { Metadata } from "next";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import { gradeDe, PALIERS } from "@/lib/membres";
import { fmtDate } from "@/lib/format";
import { resilier } from "@/app/(site)/abonnement/actions";
import ChangerMoyen from "@/components/abonnement/ChangerMoyen";

export const metadata: Metadata = { title: "Mon abonnement", robots: { index: false } };
export const dynamic = "force-dynamic";

const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default async function MonAbonnement() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = await createClient();
  const [{ data: p }, { data: factures }, { data: avoirs }] = await Promise.all([
    db.from("profiles").select("plan, plan_until, plan_formule, plan_statut, plan_fin_prevue, stripe_subscription_id, supporter_grade, supporter_depuis").eq("id", viewer.id).single(),
    db.from("supporter_factures").select("id, numero, formule, montant_cents, payee_le, periode_debut, periode_fin").eq("user_id", viewer.id).order("payee_le", { ascending: false }),
    db.from("avoirs").select("id, numero, montant_cents, rembourse_le, facture_origine").eq("user_id", viewer.id).eq("source", "supporter").order("rembourse_le", { ascending: false }),
  ]);
  const actif = hasBadge(viewer);
  const { count: suivis } = await db.from("match_presences").select("match_id", { count: "exact", head: true }).eq("user_id", viewer.id);
  const grade = p?.supporter_grade ?? 0;
  const palier = PALIERS[grade];
  const moisDepuis = p?.supporter_depuis ? Math.floor((Date.now() - new Date(p.supporter_depuis).getTime()) / (30.44 * 86400e3)) : 0;
  const abonne = !!p?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(p?.plan_statut ?? "");

  return (
    <div className="grid gap-8 max-w-3xl">
      <section aria-labelledby="h-abo" className="bg-surface border border-trait rounded-2xl p-6">
        <h2 id="h-abo" className="titre text-2xl font-extrabold">Mon abonnement</h2>
        {actif ? (
          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold rounded-full bg-moutarde text-bordeaux px-2.5 py-1">{gradeDe(grade)}</span>
              <span className="font-semibold">{p?.plan_formule === "annuel" ? "Formule annuelle, 59 € par an" : p?.plan_formule === "mensuel" ? "Formule mensuelle, 5,99 € par mois" : "Accès offert par la rédaction"}</span>
            </div>
            {p?.plan_until && (
              <p className="text-sourdine">
                {p.plan_fin_prevue || !abonne
                  ? <>Votre accès prend fin le <strong className="text-encre">{fmtDate(p.plan_until)}</strong>. Aucun nouveau prélèvement.</>
                  : <>Prochain renouvellement le <strong className="text-encre">{fmtDate(p.plan_until)}</strong>.</>}
              </p>
            )}
            <div className="rounded-xl bg-teinte p-4 text-sm">
              <p><b>Votre grade : {gradeDe(grade)}.</b> Il monte avec votre ancienneté et les matchs suivis en tribune ({suivis ?? 0} pour l&apos;instant).</p>
              {palier && <p className="mt-1 text-sourdine">Prochain grade, « {gradeDe(grade + 1)} » : {palier.mois} mois d&apos;abonnement (vous en êtes à {moisDepuis}) ou {palier.matchs} matchs suivis dans votre carnet.</p>}
            </div>
            {p?.plan_statut === "past_due" && <p className="rounded-xl bg-alerte/10 text-alerte p-3 text-sm font-semibold">Le dernier prélèvement a échoué. Mettez à jour votre moyen de paiement pour garder votre accès.</p>}
            {abonne && (
              <div className="flex flex-wrap items-start gap-3 pt-2 border-t border-trait">
                <form action={resilier}>
                  {p?.plan_fin_prevue
                    ? <><input type="hidden" name="reprendre" value="1" /><button className="bouton-or">Reprendre mon abonnement</button></>
                    : <button className="bouton-discret">Résilier à la fin de la période</button>}
                </form>
                <ChangerMoyen />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sourdine">Vous n&apos;êtes pas encore Supporter. Stats et notes complètes, alertes de match, contenus exclusifs et badge doré : 5,99 € par mois ou 59 € par an.</p>
            <Link href="/abonnement" className="bouton-or mt-4">Devenir Supporter</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="h-factures" className="bg-surface border border-trait rounded-2xl p-6">
        <h2 id="h-factures" className="titre text-2xl font-extrabold">Mes factures</h2>
        {factures?.length ? (
          <ul className="mt-4 divide-y divide-trait">
            {factures.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="font-semibold tnum">{f.numero ?? "En cours"}</span>
                <span className="text-sourdine text-sm flex-1">{fmtDate(f.payee_le)}, Supporter {f.formule}{f.periode_fin ? ` jusqu'au ${fmtDate(f.periode_fin)}` : ""}</span>
                <span className="tnum font-semibold">{euros(f.montant_cents)}</span>
                {f.numero && <a href={`/factures/${encodeURIComponent(f.numero)}`} target="_blank" rel="noopener" className="text-sm font-semibold text-vin underline underline-offset-4">Facture PDF</a>}
              </li>
            ))}
            {avoirs?.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="font-semibold tnum">{a.numero}</span>
                <span className="text-sourdine text-sm flex-1">{fmtDate(a.rembourse_le)}, remboursement{a.facture_origine ? ` de la facture ${a.facture_origine}` : ""}</span>
                <span className="tnum font-semibold text-ok">−{euros(a.montant_cents)}</span>
                {a.numero && <a href={`/factures/${encodeURIComponent(a.numero)}`} target="_blank" rel="noopener" className="text-sm font-semibold text-vin underline underline-offset-4">Avoir PDF</a>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sourdine">Vos factures apparaîtront ici après chaque échéance.</p>}
      </section>
    </div>
  );
}
