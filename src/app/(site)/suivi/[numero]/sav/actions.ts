"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { shopDb } from "@/lib/shop/admin";
import { MOTIFS_SAV, SOUHAITS, motifsPossibles, type MotifSav } from "@/lib/shop/sav";
import { sendEmail, siteUrl } from "@/lib/email/send";
import { savAlerteEmail, savRecueEmail } from "@/lib/email/templates";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Enregistre une demande de SAV : accès vérifié comme pour le suivi (e-mail de la commande, ou compte du client). */
export async function envoyerSav(form: FormData) {
  const numero = String(form.get("numero") ?? "");
  const e = typeof form.get("e") === "string" && form.get("e") ? String(form.get("e")) : null;
  const retour = (q: string) => `/suivi/${encodeURIComponent(numero)}/sav?${e ? `e=${encodeURIComponent(e)}&` : ""}${q}`;
  try {
    const r = await lireCommandeVisiteur(numero, e);
    if (!r) redirect("/suivi?introuvable=1");
    const c = r.commande;
    const motif = String(form.get("motif") ?? "") as MotifSav;
    if (!motifsPossibles(c).includes(motif)) throw new Error("Ce motif n'est plus possible pour cette commande.");
    const message = String(form.get("message") ?? "").trim().slice(0, 3000);
    if (message.length < 10) throw new Error("Décrivez votre demande en quelques mots.");
    const choisis = form.getAll("article").map(String);
    const articles = c.items.filter((i) => choisis.includes(i.variant_id)).map((i) => ({ variant_id: i.variant_id, nom: i.nom, detail: i.detail, quantite: i.quantite }));
    if (motif !== "autre" && motif !== "non_recu" && !articles.length) throw new Error("Cochez le ou les articles concernés.");
    const souhait = String(form.get("souhait") ?? "");
    const fichiers = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
    if (MOTIFS_SAV[motif].photos && !fichiers.length) throw new Error("Ajoutez au moins une photo : elle nous permet de traiter la demande tout de suite.");
    for (const f of fichiers) {
      if (!TYPES.includes(f.type)) throw new Error(`« ${f.name} » n'est pas une photo (JPEG, PNG, WebP ou HEIC).`);
      if (f.size > 8 * 1024 * 1024) throw new Error(`« ${f.name} » dépasse 8 Mo.`);
    }
    const db = shopDb();
    const photos: string[] = [];
    for (const f of fichiers) {
      const chemin = `${c.id}/${crypto.randomUUID()}.${(f.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const { error } = await db.storage.from("sav").upload(chemin, f, { contentType: f.type });
      if (error) throw new Error(`Envoi de la photo impossible : ${error.message}`);
      photos.push(chemin);
    }
    const { data: sav, error } = await db.from("shop_sav").insert({
      order_id: c.id, email: c.email, motif, articles, message, photos, souhait: souhait in SOUHAITS ? souhait : null,
    }).select("id, numero").single();
    if (error) throw new Error(error.message);
    const motifLu = MOTIFS_SAV[motif].titre;
    await sendEmail({ to: c.email, kind: "boutique", template: "sav_recue",
      email: savRecueEmail({ name: c.livraison_nom, numero: c.numero, email: c.email, sav: sav.numero, motif: motifLu }, siteUrl()) }, { idempotencyKey: `sav_recue-${sav.id}` });
    const { data: v } = await db.from("shop_settings").select("vendeur_email").eq("id", 1).single();
    if (v?.vendeur_email) {
      await sendEmail({ to: v.vendeur_email, kind: "boutique", template: "sav_alerte",
        email: savAlerteEmail({ numero: c.numero, email: c.email, sav: sav.numero, motif: motifLu, message, photos: photos.length }, siteUrl(), `${siteUrl()}/studio/boutique/commandes/${c.id}#sav`) });
    }
  } catch (err) {
    unstable_rethrow(err);
    redirect(retour(`erreur=${encodeURIComponent(err instanceof Error ? err.message : "Erreur inattendue.")}`));
  }
  redirect(`/suivi/${encodeURIComponent(numero)}?${e ? `e=${encodeURIComponent(e)}&` : ""}sav=envoyee#sav`);
}
