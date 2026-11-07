import Link from "next/link";
import { publicClient } from "@/lib/supabase/server";
import Notice from "@/components/admin/Notice";
import { POSITIONS } from "@/lib/format";

export default async function AdminJoueurs({ searchParams }: PageProps<"/admin/joueurs">) {
  const sp = await searchParams;
  const db = publicClient();
  const club = typeof sp.club === "string" ? sp.club : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { data: teams } = await db.from("teams").select("id,name").order("name");
  let query = db.from("players").select("id,first_name,last_name,position,team:teams(name)").order("last_name").limit(300);
  if (club) query = query.eq("team_id", club);
  if (q) query = query.ilike("last_name", `%${q.replace(/[%,]/g, "")}%`);
  const { data: players } = await query;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold mr-auto">Joueurs</h1>
        <Link href={`/admin/joueurs/nouveau${club ? `?club=${club}` : ""}`} className="bouton">Ajouter un joueur</Link>
      </div>
      <Notice sp={sp} />
      <form className="flex flex-wrap gap-2 mb-5" role="search">
        <label htmlFor="club" className="sr-only">Club</label>
        <select id="club" name="club" defaultValue={club} className="champ max-w-xs">
          <option value="">Tous les clubs</option>
          {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label htmlFor="q" className="sr-only">Nom</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nom" className="champ max-w-[12rem]" />
        <button className="bouton-discret">Filtrer</button>
      </form>
      {(players ?? []).length === 0 ? <p className="text-sourdine">Aucun joueur. Ajoutez l&apos;effectif d&apos;un club.</p> : (
        <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait">
          {(players ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/admin/joueurs/${p.id}`} className="flex flex-wrap items-center gap-x-4 px-4 py-2.5 hover:bg-teinte">
                <span className="font-semibold flex-1">{p.last_name.toUpperCase()} {p.first_name}</span>
                <span className="text-sm text-sourdine">{p.position ? POSITIONS[p.position] : ""}</span>
                <span className="text-sm text-sourdine w-40 truncate text-right">{(p.team as unknown as { name: string } | null)?.name ?? "Sans club"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
