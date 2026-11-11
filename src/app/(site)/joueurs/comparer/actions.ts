"use server";
import { publicClient } from "@/lib/supabase/server";

export type Trouve = { slug: string; nom: string; club: string | null; photo: string | null };

/** Recherche de joueurs pour le comparateur (nom ou prénom). */
export async function chercherJoueurs(q: string): Promise<Trouve[]> {
  const t = q.trim();
  if (t.length < 2) return [];
  const motif = `%${t.replace(/[%_]/g, "")}%`;
  const { data } = await publicClient().from("players").select("slug, first_name, last_name, photo_url, team:teams(short_name,name)")
    .or(`last_name.ilike.${motif},first_name.ilike.${motif}`).not("team_id", "is", null).order("career_points", { ascending: false, nullsFirst: false }).limit(8);
  return ((data ?? []) as unknown as { slug: string; first_name: string; last_name: string; photo_url: string | null; team: { short_name: string | null; name: string } | null }[])
    .map((p) => ({ slug: p.slug, nom: `${p.first_name} ${p.last_name}`, club: p.team?.short_name ?? p.team?.name ?? null, photo: p.photo_url }));
}
