import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { fmtDate, fmtRelative } from "@/lib/format";

import { ROLES } from "@/lib/admin";
const PAR_PAGE = 50;

type Ligne = {
  id: string; email: string; display_name: string | null; username: string | null; role: string; plan: string; plan_until: string | null;
  suspended_until: string | null; created_at: string; last_sign_in_at: string | null; commentaires: number; total: number;
};

export default async function Membres({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return <p className="text-sourdine">Réservé aux administrateurs.</p>;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const plan = typeof sp.plan === "string" ? sp.plan : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await createClient();
  const [{ data, error }, { data: tous }, { count: attente }] = await Promise.all([
    db.rpc("admin_membres", { p_q: q || null, p_role: role || null, p_plan: plan || null, p_limit: PAR_PAGE, p_offset: (page - 1) * PAR_PAGE }),
    db.rpc("admin_membres", { p_limit: 200, p_offset: 0 }),
    db.from("subscription_interest").select("user_id", { count: "exact", head: true }),
  ]);
  const lignes = (data ?? []) as Ligne[];
  const total = lignes[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const all = (tous ?? []) as Ligne[];
  const actif = (l: Pick<Ligne, "plan" | "plan_until">) => l.plan !== "free" && (!l.plan_until || new Date(l.plan_until) > new Date());
  const lien = (p: Record<string, string | number>) => {
    const u = new URLSearchParams({ ...(q && { q }), ...(role && { role }), ...(plan && { plan }), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/admin/utilisateurs?${u}`;
  };

  return (
    <div>
      <PageHeader titre="Membres" description="Tous les inscrits du site. Ouvrez une fiche pour modifier le profil, le rôle, l'abonnement, suspendre ou supprimer un compte." />
      <Notice sp={sp} />
      {error && <p className="mb-6 rounded-lg bg-alerte/10 text-alerte px-4 py-3 text-sm">{error.message}</p>}

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["Inscrits", all[0]?.total ?? 0, ""],
          ["Supporters", all.filter(actif).length, "supporter"],
          ["Veulent s'abonner", attente ?? 0, ""],
          ["Suspendus", all.filter((l) => l.suspended_until && new Date(l.suspended_until) > new Date()).length, "suspendu"],
        ].map(([k, v, f]) => (
          <Link key={String(k)} href={f ? lien({ plan: String(f) }) : "/admin/utilisateurs"} className="bg-surface border border-trait rounded-2xl p-4 hover:border-vin">
            <dt className="text-sm text-sourdine">{k}</dt>
            <dd className="titre text-3xl font-extrabold tnum">{v}</dd>
          </Link>
        ))}
      </dl>

      <form method="get" role="search" className="flex flex-wrap items-end gap-2 mb-4">
        <label className="grid gap-1 text-sm font-semibold">Recherche
          <input name="q" defaultValue={q} placeholder="Nom, pseudo ou e-mail" className="champ w-64" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Rôle
          <select name="role" defaultValue={role} className="champ">
            <option value="">Tous</option>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Statut
          <select name="plan" defaultValue={plan} className="champ">
            <option value="">Tous</option>
            <option value="supporter">Supporters</option>
            <option value="gratuit">Gratuits</option>
            <option value="suspendu">Suspendus</option>
          </select>
        </label>
        <button className="bouton-discret">Filtrer</button>
        {(q || role || plan) && <Link href="/admin/utilisateurs" className="text-sm underline underline-offset-4 text-sourdine mb-2">Effacer</Link>}
      </form>

      <p className="text-sm text-sourdine mb-2 tnum">{total} membre{total > 1 ? "s" : ""}{pages > 1 ? `, page ${page} sur ${pages}` : ""}</p>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-sourdine border-b border-trait text-left">
              <th scope="col" className="font-semibold px-4 py-2.5">Membre</th>
              <th scope="col" className="font-semibold px-3">Rôle</th>
              <th scope="col" className="font-semibold px-3">Statut</th>
              <th scope="col" className="font-semibold px-3">Inscrit</th>
              <th scope="col" className="font-semibold px-3">Dernière visite</th>
              <th scope="col" className="font-semibold px-3 text-right">Comm.</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const suspendu = l.suspended_until && new Date(l.suspended_until) > new Date();
              return (
                <tr key={l.id} className="border-b border-trait last:border-0 hover:bg-teinte/60">
                  <th scope="row" className="text-left font-normal px-4 py-2.5">
                    <Link href={`/admin/utilisateurs/${l.id}`} className="block group">
                      <span className="font-semibold group-hover:underline underline-offset-4">{l.display_name ?? "Sans nom"}</span>
                      {l.username && <span className="text-sourdine"> @{l.username}</span>}
                      <span className="block text-xs text-sourdine">{l.email}</span>
                    </Link>
                  </th>
                  <td className="px-3">{l.role === "user" ? <span className="text-sourdine">Membre</span> : <span className="font-semibold text-vin">{ROLES[l.role]}</span>}</td>
                  <td className="px-3">
                    {suspendu ? <span className="text-xs font-bold rounded-full bg-alerte/15 text-alerte px-2 py-0.5">Suspendu</span>
                      : actif(l) ? <span className="text-xs font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5">Supporter</span>
                      : <span className="text-sourdine">Gratuit</span>}
                  </td>
                  <td className="px-3 text-sourdine whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  <td className="px-3 text-sourdine whitespace-nowrap">{l.last_sign_in_at ? fmtRelative(l.last_sign_in_at) : "jamais"}</td>
                  <td className="px-3 text-right tnum">{l.commentaires}</td>
                </tr>
              );
            })}
            {!lignes.length && <tr><td colSpan={6} className="px-4 py-6 text-sourdine">Aucun membre ne correspond.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-2">
          {page > 1 && <Link href={lien({ page: page - 1 })} className="bouton-discret">Précédent</Link>}
          {page < pages && <Link href={lien({ page: page + 1 })} className="bouton-discret">Suivant</Link>}
        </nav>
      )}
    </div>
  );
}
