"use server";
import { revalidatePath } from "next/cache";
import { createClient, getViewer } from "@/lib/supabase/server";
import { IA_MODELE, IA_PLAFOND_MOIS_USD, rediger } from "@/lib/ia";
import { donneesApresMatch, courbe } from "@/lib/contenu/apres-match";

const STATUTS = ["idee", "brouillon", "pret", "publie"] as const;
type Statut = (typeof STATUTS)[number];

async function redaction() {
  const viewer = await getViewer();
  if (!viewer || viewer.role === "user") throw new Error("Accès réservé à la rédaction.");
  return { viewer, db: await createClient() };
}

export type EtatPost = { ok: boolean; message: string; id?: string };

/** Enregistre (ou met à jour) le post d'après-match d'un match. */
export async function enregistrerPost(_: EtatPost, fd: FormData): Promise<EtatPost> {
  try {
    const { db } = await redaction();
    const matchId = String(fd.get("match_id") ?? "");
    const statut = String(fd.get("statut") ?? "brouillon") as Statut;
    if (!STATUTS.includes(statut)) return { ok: false, message: "Statut inconnu." };
    const prevu = String(fd.get("prevu_le") ?? "");
    const ligne = {
      modele: "apres-match", match_id: matchId, titre: String(fd.get("titre") ?? "Après-match").slice(0, 200),
      legende: String(fd.get("legende") ?? "").slice(0, 2200),
      reseaux: fd.getAll("reseaux").map(String).filter((r) => ["instagram", "facebook", "x", "tiktok", "linkedin"].includes(r)),
      statut, prevu_le: prevu ? new Date(prevu).toISOString() : null,
      publie_le: statut === "publie" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    };
    const { data, error } = await db.from("contenus").upsert(ligne, { onConflict: "match_id,modele" }).select("id").single();
    if (error) return { ok: false, message: error.message };
    revalidatePath("/studio/contenu");
    return { ok: true, message: statut === "publie" ? "Marqué comme publié." : "Enregistré.", id: data.id };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Légende Instagram rédigée par Claude à partir des seules données du site. */
export async function redigerLegende(matchId: string): Promise<{ ok: boolean; texte?: string; message?: string }> {
  try {
    const { viewer, db } = await redaction();
    const { data: depense } = await db.rpc("ia_depense_mois");
    if (Number(depense ?? 0) >= IA_PLAFOND_MOIS_USD) return { ok: false, message: "Plafond mensuel de Claude atteint : retour le 1er du mois." };
    const d = await donneesApresMatch(matchId);
    if (!d) return { ok: false, message: "Match introuvable ou pas encore joué." };
    const top = d.notes.slice(0, 3).map((j) => `${j.prenom} ${j.nom} (${j.cote === "home" ? d.dom.court : d.ext.court}) ${j.note.toFixed(1)}${j.motm ? ", homme du match" : ""}${j.essais ? `, ${j.essais} essai(s)` : ""}`);
    const h = d.histoire;
    const faits = [
      `${d.competition}, ${new Date(d.date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" })} : ${d.dom.nom} ${d.scoreDom} - ${d.scoreExt} ${d.ext.nom}.`,
      `Essais : ${d.dom.court} ${d.chiffres.home.essais}, ${d.ext.court} ${d.chiffres.away.essais}.`,
      d.marqueurs.length ? `Marqueurs d'essais : ${d.marqueurs.map((m) => `${m.nom}${m.minute != null ? ` (${m.minute}e)` : ""}`).join(", ")}.` : "",
      `Meilleures notes Ambiance Rugby : ${top.join(" ; ")}.`,
      `Temps de domination (courbe d'ascendant) : ${d.dom.court} ${courbe(d.evenements).pctDom} %.`,
      h.matchs ? `Confrontations précédentes dans notre base : ${h.matchs} (${h.vDom} victoires ${d.dom.court}, ${h.vExt} ${d.ext.court}, ${h.nuls} nul).` : "Première confrontation dans notre base.",
      h.serie.cote && h.serie.n >= 2 ? `Série : ${h.serie.n} victoires de suite pour ${h.serie.cote === "home" ? d.dom.court : d.ext.court} dans ce duel.` : "",
      ...(["home", "away"] as const).map((c) => { const v = d.indice[c]; return v ? `Indice Ambiance ${c === "home" ? d.dom.court : d.ext.court} : ${Math.round(v.apres)} (${v.delta >= 0 ? "+" : ""}${Math.round(v.delta)})${v.rang ? `, ${v.rang}e` : ""}.` : ""; }),
    ].filter(Boolean).join("\n");
    const r = await rediger({
      systeme: "Tu es community manager d'Ambiance Rugby, média rugby français chaleureux et passionné, au ton de tribune populaire mais jamais vulgaire. Tu écris en français.",
      consigne: [
        "Écris la légende Instagram d'un carrousel d'après-match (5 images : score, notes, chiffres, courbe d'ascendant, histoire).",
        "Contraintes : une accroche forte en première ligne, 3 à 5 phrases courtes, 2 émojis maximum, une question pour faire réagir, puis une ligne « Toutes les stats sur ambiance-rugby.fr », puis 4 à 6 hashtags pertinents.",
        "N'utilise QUE les faits ci-dessous, n'invente aucun chiffre, aucun nom, aucune citation. Pas de tiret cadratin.",
        "", "Faits :", faits,
      ].join("\n"),
    });
    await db.from("ia_usage").insert({ user_id: viewer.id, match_id: d.id, model: IA_MODELE, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.coutUsd, message: "légende réseaux sociaux" });
    return { ok: true, texte: `${r.texte}`.replace(/—/g, ",") };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function changerStatut(id: string, statut: Statut) {
  const { db } = await redaction();
  if (!STATUTS.includes(statut)) return;
  await db.from("contenus").update({ statut, publie_le: statut === "publie" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/studio/contenu");
}
