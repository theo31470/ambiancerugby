import PageHeader from "@/components/admin/PageHeader";
import { shopDb } from "@/lib/shop/admin";
import { fmtRelative, isoFromNow } from "@/lib/format";

export default async function NotificationsPage() {
  const db = shopDb();
  const [{ count: abonnes }, { data: appareils }, { data: recentes }, { count: favoris }] = await Promise.all([
    db.from("push_abonnements").select("id", { count: "exact", head: true }),
    db.from("push_abonnements").select("appareil,dernier_envoi,created_at").order("created_at", { ascending: false }).limit(50),
    db.from("notifications").select("kind,title,body,created_at,read_at").gte("created_at", isoFromNow(-14 * 86400e3)).order("created_at", { ascending: false }).limit(300),
    db.from("favorite_teams").select("user_id", { count: "exact", head: true }),
  ]);
  const parType = new Map<string, number>();
  for (const n of recentes ?? []) parType.set(n.kind, (parType.get(n.kind) ?? 0) + 1);
  const lues = (recentes ?? []).filter((n) => n.read_at).length;
  const kpis = [["Appareils abonnés aux alertes", String(abonnes ?? 0)], ["Notifications, 14 jours", String((recentes ?? []).length)], ["Lues", (recentes ?? []).length ? `${Math.round((lues / (recentes ?? []).length) * 100)} %` : "–"], ["Clubs suivis", String(favoris ?? 0)]];
  return (
    <div className="grid gap-8">
      <PageHeader titre="Notifications" description="Les alertes envoyées aux supporters (coup d'envoi, essais, score final de leurs clubs) et les appareils abonnés aux alertes sur téléphone. Elles partent seules, ici vous surveillez." />
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(([k, v]) => <div key={k} className="bg-surface border border-trait rounded-2xl p-4"><dt className="text-sm text-sourdine">{k}</dt><dd className="titre text-3xl font-extrabold tnum">{v}</dd></div>)}
      </dl>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="h-types">
          <h2 id="h-types" className="text-xl font-bold mb-3">Par type, 14 jours</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait text-sm">
            {[...parType.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k} className="flex justify-between px-4 py-2.5"><span>{k}</span><span className="tnum font-semibold">{n}</span></li>)}
            {!parType.size && <li className="px-4 py-6 text-sourdine">Aucune notification récente.</li>}
          </ul>
          <h2 className="text-xl font-bold mt-6 mb-3">Appareils</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait text-sm">
            {(appareils ?? []).map((a, i) => <li key={i} className="px-4 py-2.5"><span className="font-semibold">{a.appareil ?? "Appareil"}</span><span className="block text-xs text-sourdine">abonné {fmtRelative(a.created_at)}{a.dernier_envoi ? `, dernier envoi ${fmtRelative(a.dernier_envoi)}` : ", rien envoyé encore"}</span></li>)}
            {!(appareils ?? []).length && <li className="px-4 py-6 text-sourdine">Aucun appareil abonné.</li>}
          </ul>
        </section>
        <section aria-labelledby="h-fil">
          <h2 id="h-fil" className="text-xl font-bold mb-3">Dernières envoyées</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait text-sm">
            {(recentes ?? []).slice(0, 30).map((n, i) => (
              <li key={i} className="px-4 py-2.5"><p className="font-semibold">{n.title}</p><p className="text-sourdine line-clamp-1">{n.body}</p><p className="text-xs text-sourdine">{n.kind}, {fmtRelative(n.created_at)}</p></li>
            ))}
            {!(recentes ?? []).length && <li className="px-4 py-6 text-sourdine">Rien d&apos;envoyé sur 14 jours.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
