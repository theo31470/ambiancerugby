import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import { setRole, setPlan } from "../actions";
import Notice from "@/components/admin/Notice";
import { fmtDate } from "@/lib/format";

const ROLES = { user: "Membre", editor: "Rédacteur", admin: "Administrateur" };

export default async function Utilisateurs({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return <p className="text-sourdine">Réservé aux administrateurs.</p>;
  const db = await createClient();
  const [{ data }, { data: interest }] = await Promise.all([
    db.from("profiles").select("id,display_name,username,role,plan,plan_until,created_at").order("created_at", { ascending: false }).limit(300),
    db.from("subscription_interest").select("user_id"),
  ]);
  const attente = new Set((interest ?? []).map((i) => i.user_id));
  const supporters = (data ?? []).filter((u) => hasBadge(u as { plan: "free" | "supporter"; plan_until: string | null })).length;

  return (
    <div>
      <PageHeader titre="Membres" description="Un rédacteur écrit les articles et saisit matchs, clubs et joueurs. Un administrateur gère en plus les rôles et les abonnements." />
      <p className="mb-6 text-sm tnum">
        <span className="font-semibold">{(data ?? []).length}</span> inscrits, <span className="font-semibold">{supporters}</span> Supporters,{" "}
        <span className="font-semibold">{attente.size}</span> en attente de l&apos;ouverture du paiement.
      </p>
      <Notice sp={sp} />
      <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
        {(data ?? []).map((u) => {
          const badge = hasBadge(u as { plan: "free" | "supporter"; plan_until: string | null });
          return (
            <li key={u.id} className="px-4 py-3 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <span className="min-w-0">
                <span className="font-semibold">{u.display_name ?? "Sans nom"}</span>
                {u.username && <span className="text-sourdine"> @{u.username}</span>}
                {badge && <span className="ml-2 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Supporter</span>}
                {attente.has(u.id) && !badge && <span className="ml-2 text-[10px] font-bold rounded-full bg-teinte text-vin px-1.5 py-0.5">Veut s&apos;abonner</span>}
                <span className="block text-xs text-sourdine">inscrit le {fmtDate(u.created_at)}{badge && u.plan_until ? `, Supporter jusqu'au ${fmtDate(u.plan_until)}` : ""}</span>
              </span>
              <form action={setPlan} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="_back" value="/admin/utilisateurs" />
                <label htmlFor={`p-${u.id}`} className="sr-only">Abonnement</label>
                <select id={`p-${u.id}`} name="duree" defaultValue="" className="champ w-44">
                  <option value="" disabled>{badge ? "Supporter" : "Gratuit"}</option>
                  <option value="1">Supporter 1 mois</option>
                  <option value="12">Supporter 1 an</option>
                  <option value="0">Supporter sans limite</option>
                  <option value="free">Repasser en gratuit</option>
                </select>
                <button className="bouton-discret">Appliquer</button>
              </form>
              {u.id === viewer.id ? (
                <span className="text-sm font-semibold">{ROLES[u.role as keyof typeof ROLES]} (vous)</span>
              ) : (
                <form action={setRole} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="_back" value="/admin/utilisateurs" />
                  <label htmlFor={`r-${u.id}`} className="sr-only">Rôle</label>
                  <select id={`r-${u.id}`} name="role" defaultValue={u.role} className="champ w-40">
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="bouton-discret">Changer</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
