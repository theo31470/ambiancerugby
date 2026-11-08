import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
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
      <PageHeader titre="Clubs et sélections" description="Noms, logos, couleurs et descriptions. Les logos viennent d'API-Sports ; un logo envoyé ici n'est jamais remplacé."
        actions={<>
          <form role="search" className="flex gap-2">
            <label htmlFor="q" className="sr-only">Chercher un club</label>
            <input id="q" name="q" defaultValue={q} placeholder="Chercher un club" className="champ w-44" />
          </form>
          <Link href="/admin/clubs/nouveau" className="bouton-discret">Ajouter une équipe</Link>
        </>} />
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
