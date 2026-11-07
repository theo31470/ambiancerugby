import TeamForm from "@/components/admin/TeamForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouveauClub({ searchParams }: PageProps<"/admin/clubs/nouveau">) {
  const sp = await searchParams;
  const { data: comps } = await publicClient().from("competitions").select("id,name,current_season").order("sort_order");
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Nouvelle équipe</h1>
      <Notice sp={sp} />
      <TeamForm competitions={comps ?? []} inComps={[]} back="/admin/clubs/nouveau" />
    </div>
  );
}
