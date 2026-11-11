"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/actions";
import { JE_SUIS } from "@/lib/membres";


async function moi() {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) throw new Error("Connectez-vous pour modifier votre compte.");
  return { db, uid, email: data?.claims?.email as string | undefined };
}
const texte = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;

/** Profil public : nom, pseudo, photo, bio, ville, rôle dans le rugby, club de cœur. */
export async function enregistrerProfil(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { db, uid } = await moi();
    const username = texte(form, "username", 30);
    if (username && !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) return { error: "Le pseudo fait 3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas." };
    const jeSuis = String(form.get("je_suis") ?? "");
    const patch: Record<string, unknown> = {
      display_name: texte(form, "display_name", 40), username, bio: texte(form, "bio", 280), ville: texte(form, "ville", 60),
      je_suis: jeSuis in JE_SUIS ? jeSuis : null, favorite_team_id: String(form.get("favorite_team_id") ?? "") || null,
    };
    // photo : envoyée dans le dossier personnel du membre, remplace la précédente
    const photo = form.get("avatar");
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > 3 * 1024 * 1024) return { error: "La photo dépasse 3 Mo." };
      if (!/^image\/(jpeg|png|webp)$/.test(photo.type)) return { error: "Photo en JPEG, PNG ou WebP." };
      const ext = photo.type.split("/")[1].replace("jpeg", "jpg");
      const chemin = `avatars/${uid}/photo-${Date.now()}.${ext}`;
      const { error } = await db.storage.from("media").upload(chemin, photo, { contentType: photo.type, upsert: true });
      if (error) return { error: `Photo non enregistrée : ${error.message}` };
      patch.avatar_url = db.storage.from("media").getPublicUrl(chemin).data.publicUrl;
    }
    if (form.get("retirer_avatar") === "1") patch.avatar_url = null;
    const { error } = await db.from("profiles").update(patch).eq("id", uid);
    if (error) return { error: error.code === "23505" ? "Ce pseudo est déjà pris." : error.message };
    revalidatePath("/", "layout");
    return { ok: "Profil enregistré." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Préférences d'affichage, d'e-mails et de confidentialité. */
export async function enregistrerPreferences(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { db, uid } = await moi();
    const coche = (k: string) => form.get(k) === "on";
    const theme = String(form.get("theme") ?? "auto");
    const prefs = {
      theme: ["auto", "clair", "sombre"].includes(theme) ? theme : "auto",
      email_actus: coche("email_actus"), email_alertes: coche("email_alertes"), email_boutique: coche("email_boutique"),
      alertes_essais: coche("alertes_essais"), alertes_debut: coche("alertes_debut"), alertes_resultat: coche("alertes_resultat"),
      celebrations: coche("celebrations"),
    };
    const { error } = await db.from("profiles").update({ prefs, profil_public: coche("profil_public") }).eq("id", uid);
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { ok: "Préférences enregistrées." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Nouvelle adresse e-mail : un lien de confirmation part sur la nouvelle adresse. */
export async function changerEmail(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { db } = await moi();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse e-mail invalide." };
    const { error } = await db.auth.updateUser({ email });
    if (error) return { error: error.message };
    return { ok: `Un lien de confirmation a été envoyé à ${email}. Le changement prend effet après validation.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Nouveau mot de passe, après vérification de l'actuel. */
export async function changerMotDePasse(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { db, email } = await moi();
    const actuel = String(form.get("actuel") ?? "");
    const nouveau = String(form.get("nouveau") ?? "");
    if (nouveau.length < 8) return { error: "Le nouveau mot de passe fait au moins 8 caractères." };
    if (nouveau !== String(form.get("confirmation") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };
    if (!email) return { error: "Adresse e-mail introuvable." };
    const { error: e1 } = await db.auth.signInWithPassword({ email, password: actuel });
    if (e1) return { error: "Mot de passe actuel incorrect." };
    const { error } = await db.auth.updateUser({ password: nouveau });
    if (error) return { error: error.message };
    return { ok: "Mot de passe modifié." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Déconnecte toutes les sessions ouvertes (téléphone, ordinateur…), y compris celle-ci. */
export async function deconnecterPartout() {
  const { db } = await moi();
  await db.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/connexion?ok=deconnecte");
}

/** Suppression définitive du compte, confirmée en tapant SUPPRIMER. */
export async function supprimerCompte(_: FormState, form: FormData): Promise<FormState> {
  const { db } = await moi();
  if (String(form.get("confirmation") ?? "").trim().toUpperCase() !== "SUPPRIMER") return { error: "Tapez SUPPRIMER pour confirmer." };
  const { error } = await db.rpc("supprimer_mon_compte");
  if (error) return { error: error.message };
  await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?ok=compte-supprime");
}
