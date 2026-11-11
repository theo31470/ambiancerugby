"use server";
import { revalidatePath } from "next/cache";
import { createClient, getViewer } from "@/lib/supabase/server";
import { semaineActive } from "@/lib/xv";

export async function enregistrerXV(joueurs: Record<string, string>): Promise<{ ok?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connectez-vous pour composer votre XV." };
  if (!viewer.supporter) return { error: "Composer son XV est réservé aux Supporters." };
  const propre: Record<string, string> = {};
  for (const [k, v] of Object.entries(joueurs)) if (/^(1[0-5]|[1-9])$/.test(k) && /^[0-9a-f-]{36}$/.test(v)) propre[k] = v;
  if (new Set(Object.values(propre)).size !== Object.values(propre).length) return { error: "Un joueur ne peut occuper qu'un poste." };
  const s = await semaineActive();
  const { error } = await (await createClient()).from("xv_semaine").upsert({ user_id: viewer.id, semaine: s.cle, joueurs: propre, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/pronos/xv");
  return { ok: Object.keys(propre).length === 15 ? "XV complet enregistré !" : `Enregistré (${Object.keys(propre).length}/15)` };
}
