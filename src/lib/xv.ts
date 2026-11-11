import { publicClient } from "@/lib/supabase/server";

/** XV de la semaine : on compose son équipe parmi les joueurs qui ont joué la semaine (lundi au dimanche, heure de Paris). */

import type { Candidat } from "./xv-commun";
export type { Candidat } from "./xv-commun";
export { LIGNES_XV, POSTES_XV } from "./xv-commun";

/** Clé ISO « 2026-W46 » et bornes (lundi 0 h → lundi suivant 0 h, Paris) de la semaine contenant la date. */
export function semaineDe(d = new Date()) {
  const paris = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const jour = (paris.getDay() + 6) % 7; // lundi = 0
  const lundi = new Date(paris); lundi.setHours(0, 0, 0, 0); lundi.setDate(paris.getDate() - jour);
  const decalage = d.getTime() - paris.getTime(); // écart entre l'heure locale du serveur et Paris
  const debut = new Date(lundi.getTime() + decalage), fin = new Date(debut.getTime() + 7 * 86400e3);
  const jeudi = new Date(lundi); jeudi.setDate(lundi.getDate() + 3);
  const an = jeudi.getFullYear();
  const s1 = new Date(an, 0, 4);
  const num = 1 + Math.round(((jeudi.getTime() - s1.getTime()) / 86400e3 - 3 + ((s1.getDay() + 6) % 7)) / 7);
  return { cle: `${an}-W${String(num).padStart(2, "0")}`, debut, fin };
}

/** La semaine à composer : celle en cours si des matchs ont déjà été joués, sinon la précédente (jusqu'au mardi midi). */
export async function semaineActive() {
  const now = new Date();
  const cur = semaineDe(now);
  const { count } = await publicClient().from("matches").select("id", { count: "exact", head: true }).eq("status", "finished").gte("kickoff_at", cur.debut.toISOString()).lt("kickoff_at", now.toISOString());
  const prec = semaineDe(new Date(cur.debut.getTime() - 86400e3));
  const mardiMidi = new Date(cur.debut.getTime() + 36 * 3600e3);
  if ((count ?? 0) > 0 || now > mardiMidi) return { ...cur, ouverte: true };
  return { ...prec, ouverte: true };
}

export async function candidats(debut: Date, fin: Date): Promise<Map<number, Candidat[]>> {
  const db = publicClient();
  const { data: ms } = await db.from("matches").select("id, competition:competitions(slug,niveau)").eq("status", "finished").gte("kickoff_at", debut.toISOString()).lt("kickoff_at", fin.toISOString());
  const ids = ((ms ?? []) as unknown as { id: string; competition: { slug: string; niveau: number | null } }[])
    .filter((m) => (m.competition.niveau ?? 0) >= 1500 || ["pro-d2", "challenge-cup"].includes(m.competition.slug)).map((m) => m.id);
  const out = new Map<number, Candidat[]>();
  for (let i = 0; i < ids.length; i += 60) {
    const { data } = await db.from("player_match_stats")
      .select("numero, rating, player:players(id,slug,first_name,last_name,photo_url), team:teams(short_name,name)")
      .in("match_id", ids.slice(i, i + 60)).gte("numero", 1).lte("numero", 15);
    for (const l of (data ?? []) as unknown as { numero: number; rating: number | null; player: { id: string; slug: string; first_name: string; last_name: string; photo_url: string | null }; team: { short_name: string | null; name: string } | null }[]) {
      const liste = out.get(l.numero) ?? [];
      liste.push({ id: l.player.id, slug: l.player.slug, nom: `${l.player.first_name} ${l.player.last_name}`, photo: l.player.photo_url, club: l.team?.short_name ?? l.team?.name ?? null, note: l.rating != null ? Number(l.rating) : null, numero: l.numero });
      out.set(l.numero, liste);
    }
  }
  for (const [n, l] of out) out.set(n, l.sort((a, b) => (b.note ?? 0) - (a.note ?? 0)).slice(0, 40));
  return out;
}

