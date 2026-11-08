import TeamForm from "@/components/admin/TeamForm";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouveauClub({ searchParams }: PageProps<"/admin/clubs/nouveau">) {
  const sp = await searchParams;
  const { data: comps } = await publicClient().from("competitions").select("id,name,current_season").order("sort_order");
  return (
    <div>
      <PageHeader titre="Nouvelle équipe" description="Les clubs des compétitions suivies sont créés automatiquement ; ajoutez ici une équipe que l'API ne connaît pas." />
      <Notice sp={sp} />
      <TeamForm competitions={comps ?? []} inComps={[]} back="/admin/clubs/nouveau" />
    </div>
  );
}
