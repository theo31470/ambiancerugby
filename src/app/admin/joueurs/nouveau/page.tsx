import PlayerForm from "@/components/admin/PlayerForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouveauJoueur({ searchParams }: PageProps<"/admin/joueurs/nouveau">) {
  const sp = await searchParams;
  const { data: teams } = await publicClient().from("teams").select("id,name").order("name");
  const club = typeof sp.club === "string" ? sp.club : undefined;
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Nouveau joueur</h1>
      <Notice sp={sp} />
      <PlayerForm teams={teams ?? []} defaultTeam={club} back={`/admin/joueurs/nouveau${club ? `?club=${club}` : ""}`} />
    </div>
  );
}
