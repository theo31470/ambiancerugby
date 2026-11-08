import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
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
      <PageHeader titre={`${p.first_name} ${p.last_name}`} actions={<Link href={`/joueurs/${p.slug}`} className="bouton-discret">Voir la fiche</Link>} />
      <Notice sp={sp} />
      <PlayerForm player={p} teams={teams ?? []} back={`/admin/joueurs/${id}`} />
    </div>
  );
}
