"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou mot de passe incorrect.",
  "Email not confirmed": "Confirmez d'abord votre adresse e-mail grâce au lien reçu.",
  "User already registered": "Un compte existe déjà avec cette adresse. Connectez-vous.",
};
const authMsg = (m: string) => AUTH_ERRORS[m] ?? m;

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: authMsg(error.message) };
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("suite")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? "").trim(),
    password,
    options: {
      data: { display_name: String(form.get("display_name") ?? "").trim() || undefined },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return { error: authMsg(error.message) };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/compte");
  }
  return { ok: "Compte créé. Ouvrez le lien reçu par e-mail pour l'activer, puis connectez-vous." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { error: "Connectez-vous pour modifier votre profil." };
  const username = String(form.get("username") ?? "").trim() || null;
  if (username && !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return { error: "Le pseudo fait 3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas." };
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(form.get("display_name") ?? "").trim() || null,
      username,
      favorite_team_id: String(form.get("favorite_team_id") ?? "") || null,
    })
    .eq("id", uid);
  if (error) return { error: error.code === "23505" ? "Ce pseudo est déjà pris." : error.message };
  revalidatePath("/", "layout");
  return { ok: "Profil enregistré." };
}

export async function addComment(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { error: "Connectez-vous pour commenter." };
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Écrivez votre commentaire avant de l'envoyer." };
  if (body.length > 2000) return { error: "2 000 caractères maximum." };
  const articleId = String(form.get("article_id") ?? "") || null;
  const matchId = String(form.get("match_id") ?? "") || null;
  const { error } = await supabase.from("comments").insert({ user_id: uid, body, article_id: articleId, match_id: matchId });
  if (error) return { error: error.message };
  revalidatePath(String(form.get("path") ?? "/"));
  return { ok: "Commentaire publié." };
}

export async function deleteComment(form: FormData) {
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", String(form.get("id")));
  revalidatePath(String(form.get("path") ?? "/"));
}

export async function toggleFavorite(form: FormData) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  const path = String(form.get("path") ?? "/");
  if (!uid) redirect(`/connexion?suite=${encodeURIComponent(path)}`);
  const kind = form.get("kind") === "player" ? "player" : "team";
  const id = String(form.get("id"));
  const table = kind === "team" ? "favorite_teams" : "favorite_players";
  const col = kind === "team" ? "team_id" : "player_id";
  if (form.get("on") === "1") {
    await supabase.from(table).delete().eq("user_id", uid).eq(col, id);
  } else {
    await supabase.from(table).insert({ user_id: uid, [col]: id });
  }
  revalidatePath(path);
}

export async function rejoindreListe() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/connexion?suite=/abonnement");
  await supabase.from("subscription_interest").upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true });
  revalidatePath("/abonnement");
  redirect("/abonnement?ok=1");
}

export async function toutLu() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function viderAlertes() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return;
  await supabase.from("notifications").delete().eq("user_id", uid);
  revalidatePath("/", "layout");
}

/** Mot de passe oublié : Supabase envoie (via notre hook) un lien qui ouvre la page du nouveau mot de passe. Même réponse que l'adresse existe ou non. */
export async function demanderReinitialisation(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Saisissez une adresse e-mail valide." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?suite=/compte/nouveau-mot-de-passe` });
  if (error && /rate|seconds/i.test(error.message)) return { error: "Un e-mail vient déjà de partir. Patientez une minute avant de recommencer." };
  return { ok: "Si un compte existe avec cette adresse, un e-mail vient de partir. Ouvrez le lien qu'il contient (valable 1 heure)." };
}

/** Nouveau mot de passe, une fois connecté par le lien reçu. */
export async function definirMotDePasse(_: FormState, form: FormData): Promise<FormState> {
  const nouveau = String(form.get("nouveau") ?? "");
  if (nouveau.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (nouveau !== String(form.get("confirmation") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nouveau });
  if (error) return { error: /different from the old/i.test(error.message) ? "Choisissez un mot de passe différent de l'ancien." : error.message };
  revalidatePath("/", "layout");
  redirect("/compte?mdp=ok");
}
