import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { notFound } from "next/navigation";
import TeamForm from "@/components/admin/TeamForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export default async function EditClub({ params, searchParams }: PageProps<"/admin/clubs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = publicClient();
  const { data: team } = await db.from("teams").select("*").eq("id", id).maybeSingle();
  if (!team) notFound();
  const [{ data: comps }, { data: links }, { count }] = await Promise.all([
    db.from("competitions").select("id,name,current_season").order("sort_order"),
    db.from("team_competitions").select("competition_id,season").eq("team_id", id),
    db.from("players").select("*", { count: "exact", head: true }).eq("team_id", id),
  ]);
  const inComps = (comps ?? []).filter((c) => (links ?? []).some((l) => l.competition_id === c.id && l.season === c.current_season)).map((c) => c.id);
  return (
    <div>
      <PageHeader titre={(team as Team).name}
        actions={<>
          <Link href={`/admin/joueurs?club=${id}`} className="bouton-discret">Effectif ({count ?? 0})</Link>
          <Link href={`/clubs/${(team as Team).slug}`} className="bouton-discret">Voir la fiche</Link>
        </>} />
      <Notice sp={sp} />
      <TeamForm team={team as Team} competitions={comps ?? []} inComps={inComps} back={`/admin/clubs/${id}`} />
    </div>
  );
}
