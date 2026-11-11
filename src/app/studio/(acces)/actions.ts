"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/actions";

const suiteSure = (s: FormDataEntryValue | null) => { const v = String(s ?? ""); return v.startsWith("/studio") && !v.startsWith("//") ? v : "/studio"; };

/** Connexion au studio : mot de passe, puis vérification du rôle ; le code à 6 chiffres vient ensuite. */
export async function connexionStudio(_: FormState, form: FormData): Promise<FormState> {
  const db = await createClient();
  const email = String(form.get("email") ?? "").trim();
  const { data, error } = await db.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error || !data.user) return { error: "Identifiants incorrects." };
  const { data: p } = await db.from("profiles").select("role, suspended_until").eq("id", data.user.id).single();
  if (!p || p.role === "user" || (p.suspended_until && new Date(p.suspended_until) > new Date())) {
    await db.auth.signOut();
    return { error: "Ce compte n'a pas accès au studio." };
  }
  redirect(`/studio/securite?suite=${encodeURIComponent(suiteSure(form.get("suite")))}`);
}

export async function quitterStudio() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/studio/connexion");
}
