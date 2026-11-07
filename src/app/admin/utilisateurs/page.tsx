import { createClient, getViewer } from "@/lib/supabase/server";
import { setRole } from "../actions";
import Notice from "@/components/admin/Notice";
import { fmtDate } from "@/lib/format";

const ROLES = { user: "Supporter", editor: "Rédacteur", admin: "Administrateur" };

export default async function Utilisateurs({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return <p className="text-sourdine">Réservé aux administrateurs.</p>;
  const db = await createClient();
  const { data } = await db.from("profiles").select("id,display_name,username,role,created_at").order("created_at", { ascending: false }).limit(300);
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-2">Utilisateurs</h1>
      <p className="text-sourdine mb-6">Un rédacteur peut écrire des articles et saisir matchs, clubs et joueurs. Un administrateur peut en plus gérer les rôles.</p>
      <Notice sp={sp} />
      <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait">
        {(data ?? []).map((u) => (
          <li key={u.id}>
            <form action={setRole} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="_back" value="/admin/utilisateurs" />
              <span className="flex-1 min-w-40">
                <span className="font-semibold">{u.display_name ?? "Sans nom"}</span>
                {u.username && <span className="text-sourdine"> @{u.username}</span>}
                <span className="block text-xs text-sourdine">inscrit le {fmtDate(u.created_at)}</span>
              </span>
              {u.id === viewer.id ? (
                <span className="text-sm font-semibold">{ROLES[u.role as keyof typeof ROLES]} (vous)</span>
              ) : (
                <>
                  <label htmlFor={`r-${u.id}`} className="sr-only">Rôle</label>
                  <select id={`r-${u.id}`} name="role" defaultValue={u.role} className="champ w-40">
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="bouton-discret">Changer</button>
                </>
              )}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
