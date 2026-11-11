import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Client lié à la session de l'utilisateur (cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // appelé depuis un Server Component : le proxy rafraîchit la session
        }
      },
    },
  });
}

/** Client anonyme pour les données publiques (pas de cookies). */
export function publicClient() {
  return createPlainClient(URL, KEY, { auth: { persistSession: false } });
}

export type Viewer = {
  id: string;
  email: string | undefined;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  favorite_team_id: string | null;
  role: "user" | "editor" | "admin";
  plan: "free" | "supporter";
  plan_until: string | null;
  /** abonnement Supporter actif (ou membre de la rédaction, qui voit tout) */
  supporter: boolean;
  created_at: string;
  bio?: string | null;
  ville?: string | null;
  je_suis?: string | null;
  profil_public?: boolean;
  prefs?: Record<string, unknown>;
};

/** Utilisateur connecté + profil, mémorisé pour la requête. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", sub).single();
  if (!profile) return null;
  const active = profile.plan === "supporter" && (!profile.plan_until || new Date(profile.plan_until) > new Date());
  return {
    ...profile,
    email: claims?.claims?.email as string | undefined,
    supporter: active || profile.role !== "user",
  } as Viewer;
});

/** Abonné Supporter au sens strict (pour le badge). */
export function hasBadge(v: { plan: string; plan_until: string | null } | null | undefined) {
  return !!v && v.plan === "supporter" && (!v.plan_until || new Date(v.plan_until) > new Date());
}
