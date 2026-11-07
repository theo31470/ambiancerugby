import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Notice from "@/components/admin/Notice";
import TeamBadge from "@/components/TeamBadge";
import type { Team } from "@/lib/types";

export default async function AdminClubs({ searchParams }: PageProps<"/admin/clubs">) {
  const sp = await searchParams;
  const db = await createClient();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  let query = db.from("teams").select("*").order("name").limit(300);
  if (q) query = query.ilike("name", `%${q.replace(/[%,]/g, "")}%`);
  const { data } = await query;
  const teams = (data ?? []) as Team[];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold mr-auto">Clubs et sélections</h1>
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">Chercher un club</label>
          <input id="q" name="q" defaultValue={q} placeholder="Chercher" className="champ w-40" />
        </form>
        <Link href="/admin/clubs/nouveau" className="bouton">Ajouter une équipe</Link>
      </div>
      <Notice sp={sp} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/clubs/${t.id}`} className="flex items-center gap-3 bg-surface border border-trait rounded-lg p-3 hover:border-vin">
              <TeamBadge team={t} size="sm" />
              <span className="font-semibold flex-1 truncate">{t.name}</span>
              <span className="text-xs text-sourdine">{t.city ?? t.country}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
