import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerForm from "@/components/admin/PlayerForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";

export default async function EditJoueur({ params, searchParams }: PageProps<"/admin/joueurs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: player }, { data: teams }] = await Promise.all([
    db.from("players").select("*").eq("id", id).maybeSingle(),
    db.from("teams").select("id,name").order("name"),
  ]);
  if (!player) notFound();
  const p = player as Player;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold mr-auto">{p.first_name} {p.last_name}</h1>
        <Link href={`/joueurs/${p.slug}`} className="bouton-discret">Voir la fiche</Link>
      </div>
      <Notice sp={sp} />
      <PlayerForm player={p} teams={teams ?? []} back={`/admin/joueurs/${id}`} />
    </div>
  );
}
