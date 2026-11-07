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
};

/** Utilisateur connecté + profil, mémorisé pour la requête. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", sub).single();
  if (!profile) return null;
  return { ...profile, email: claims?.claims?.email as string | undefined } as Viewer;
});
