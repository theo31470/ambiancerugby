"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";

export type Etat = { ok?: string; error?: string } | undefined;

/** Pronostic d'un match (avant le coup d'envoi ; la base refuse ensuite). Score vide = pronostic retiré. */
export async function enregistrerProno(matchId: string, dom: number | null, ext: number | null): Promise<Etat> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connectez-vous pour pronostiquer." };
  const db = await createClient();
  if (dom == null || ext == null) {
    await db.from("pronos").delete().eq("user_id", viewer.id).eq("match_id", matchId);
    return { ok: "Pronostic retiré." };
  }
  if (![dom, ext].every((x) => Number.isInteger(x) && x >= 0 && x <= 150)) return { error: "Score invalide." };
  const { error } = await db.from("pronos").upsert({ user_id: viewer.id, match_id: matchId, home_score: dom, away_score: ext, updated_at: new Date().toISOString() });
  if (error) return { error: /row-level|policy/i.test(error.message) ? "Trop tard : le match a commencé." : error.message };
  return { ok: "Enregistré" };
}

export async function creerLigue(_: Etat, form: FormData): Promise<Etat> {
  const db = await createClient();
  const nom = String(form.get("nom") ?? "").trim();
  if (nom.length < 2) return { error: "Donnez un nom à votre ligue." };
  const { data, error } = await db.rpc("ligue_creer", { p_nom: nom });
  if (error) return { error: error.message };
  revalidatePath("/pronos");
  redirect(`/pronos/ligues/${data}`);
}

export async function rejoindreLigue(_: Etat, form: FormData): Promise<Etat> {
  const db = await createClient();
  const { data, error } = await db.rpc("ligue_rejoindre", { p_code: String(form.get("code") ?? "") });
  if (error) return { error: error.message };
  revalidatePath("/pronos");
  redirect(`/pronos/ligues/${data}`);
}

export async function quitterLigue(form: FormData) {
  const db = await createClient();
  await db.rpc("ligue_quitter", { p_ligue: String(form.get("id") ?? "") });
  revalidatePath("/pronos");
  redirect("/pronos?vue=ligues");
}
