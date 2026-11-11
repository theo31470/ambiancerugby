"use server";
import { createClient, getViewer } from "@/lib/supabase/server";

export async function voterNote(matchId: string, playerId: string, note: number): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.supporter) return { error: "Réservé aux Supporters." };
  if (!Number.isInteger(note) || note < 1 || note > 10) return { error: "Note invalide." };
  const db = await createClient();
  const { data: m } = await db.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (m?.status !== "finished") return { error: "Le vote ouvre au coup de sifflet final." };
  const { error } = await db.from("player_votes").upsert({ user_id: viewer.id, match_id: matchId, player_id: playerId, note });
  return error ? { error: error.message } : {};
}
