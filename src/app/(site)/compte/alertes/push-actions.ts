"use server";
import { getViewer } from "@/lib/supabase/server";
import { shopDb } from "@/lib/shop/admin";

type Abo = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Enregistre l'abonnement push de cet appareil pour le membre connecté. */
export async function enregistrerPush(abo: Abo, appareil: string) {
  const viewer = await getViewer();
  if (!viewer || !abo?.endpoint?.startsWith("https://") || !abo.keys?.p256dh || !abo.keys?.auth) return { ok: false };
  const supabase = shopDb(); // l'endpoint peut appartenir à un ancien compte de cet appareil
  // l'appareil a pu servir à un autre compte : on repart de zéro pour cet endpoint
  await supabase.from("push_abonnements").delete().eq("endpoint", abo.endpoint);
  const { error } = await supabase.from("push_abonnements").insert({
    user_id: viewer.id, endpoint: abo.endpoint, p256dh: abo.keys.p256dh, auth: abo.keys.auth, appareil: appareil.slice(0, 120),
  });
  return { ok: !error };
}

export async function oublierPush(endpoint: string) {
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  const supabase = shopDb(); // l'endpoint peut appartenir à un ancien compte de cet appareil
  await supabase.from("push_abonnements").delete().eq("endpoint", endpoint).eq("user_id", viewer.id);
  return { ok: true };
}
