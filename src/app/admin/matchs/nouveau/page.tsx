import MatchForm from "@/components/admin/MatchForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouveauMatch({ searchParams }: PageProps<"/admin/matchs/nouveau">) {
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: comps }, { data: teams }] = await Promise.all([
    db.from("competitions").select("id,name,current_season").order("sort_order"),
    db.from("teams").select("id,name").order("name"),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Nouveau match</h1>
      <Notice sp={sp} />
      <MatchForm competitions={comps ?? []} teams={teams ?? []} back="/admin/matchs/nouveau" defaultCompetition={typeof sp.c === "string" ? sp.c : undefined} />
    </div>
  );
}
