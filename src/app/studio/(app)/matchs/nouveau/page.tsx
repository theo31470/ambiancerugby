import MatchForm from "@/components/admin/MatchForm";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouveauMatch({ searchParams }: PageProps<"/studio/matchs/nouveau">) {
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: comps }, { data: teams }] = await Promise.all([
    db.from("competitions").select("id,name,current_season").order("sort_order"),
    db.from("teams").select("id,name").order("name"),
  ]);
  return (
    <div>
      <PageHeader titre="Nouveau match" description="Pour un match que l'API ne couvre pas (amical, compétition non suivie)." />
      <Notice sp={sp} />
      <MatchForm competitions={comps ?? []} teams={teams ?? []} back="/studio/matchs/nouveau" defaultCompetition={typeof sp.c === "string" ? sp.c : undefined} />
    </div>
  );
}
