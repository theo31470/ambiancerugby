"use server";
import { revalidatePath } from "next/cache";
import { createClient, getViewer } from "@/lib/supabase/server";
import { chercherFeuille, IA_MODELE, IA_PLAFOND_MOIS_USD } from "@/lib/ia";
import { fmtDay } from "@/lib/format";
import { ecrireFil, filDepuisIA } from "@/lib/fil";

export type EtatRecherche = { matchId: string; etat: "valide" | "proposition" | "rien" | "erreur" | "deja"; message: string; propId?: string };

const pts = (l: { tries: number; conversions: number; penalty_goals: number; drop_goals: number }) => 5 * l.tries + 2 * l.conversions + 3 * (l.penalty_goals + l.drop_goals);

/**
 * Claude cherche le compte rendu d'un match sur le web et relève marqueurs et cartons.
 * Validation automatique seulement si tout colle : joueurs reconnus et points = score officiel des deux équipes.
 */
export async function chercherMatchIA(matchId: string, auto: boolean): Promise<EtatRecherche> {
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.role === "user") return { matchId, etat: "erreur", message: "Accès réservé à la rédaction." };
    const db = await createClient();

    const { data: depense } = await db.rpc("ia_depense_mois");
    if (Number(depense ?? 0) >= IA_PLAFOND_MOIS_USD) return { matchId, etat: "erreur", message: "Plafond mensuel atteint : la recherche revient le 1er du mois." };

    const { data: m } = await db.from("matches")
      .select("id, status, kickoff_at, home_score, away_score, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name), competition:competitions(name)")
      .eq("id", matchId).single();
    if (!m) return { matchId, etat: "erreur", message: "Match introuvable." };
    if (m.status !== "finished") return { matchId, etat: "rien", message: "Match pas encore terminé." };
    const { count: deja } = await db.from("player_match_stats").select("player_id", { count: "exact", head: true }).eq("match_id", matchId);

    const { data: joueurs } = await db.from("players").select("id, first_name, last_name, position, team_id").in("team_id", [m.home_team_id, m.away_team_id]).eq("in_squad", true).order("last_name");
    const refs = new Map<string, string>();
    const effectif = (teamId: string, prefixe: string) => (joueurs ?? []).filter((j) => j.team_id === teamId).map((j, i) => {
      const ref = `${prefixe}${i + 1}`;
      refs.set(ref, j.id);
      return { ref, nom: `${j.first_name} ${j.last_name}`.trim(), poste: j.position };
    });
    const nom = (x: unknown) => (x as { name: string } | null)?.name ?? "";

    let r;
    try {
      r = await chercherFeuille({
        domicile: nom(m.home), exterieur: nom(m.away), competition: nom(m.competition),
        date: fmtDay(m.kickoff_at, { day: "numeric", month: "long", year: "numeric" }),
        scoreDom: m.home_score, scoreExt: m.away_score,
        effectifDom: effectif(m.home_team_id, "H"), effectifExt: effectif(m.away_team_id, "A"),
      });
    } catch (e) {
      await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, ok: false, message: (e as Error).message.slice(0, 300) });
      return { matchId, etat: "erreur", message: (e as Error).message };
    }
    await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.coutUsd, message: `recherche web (${r.recherches})` });

    const lignes = r.lignes.filter((l) => l.ref && refs.has(l.ref) && (l.ref.startsWith("H") ? l.equipe === "home" : l.equipe === "away"))
      .map((l) => ({ cote: l.equipe, player_id: refs.get(l.ref!)!, tries: l.essais, conversions: l.transformations, penalty_goals: l.penalites, drop_goals: l.drops, yellow: l.cartons_jaunes, red: l.cartons_rouges }));
    const inconnus = r.lignes.filter((l) => !l.ref || !refs.has(l.ref)).map((l) => ({ cote: l.equipe, nom: l.nom_lu, essais: l.essais, transformations: l.transformations, penalites: l.penalites, drops: l.drops, cj: l.cartons_jaunes, cr: l.cartons_rouges }));
    if (!lignes.length && !inconnus.length) return { matchId, etat: "rien", message: r.remarques || "Aucun compte rendu trouvé." };

    const totalDom = lignes.filter((l) => l.cote === "home").reduce((s, l) => s + pts(l), 0);
    const totalExt = lignes.filter((l) => l.cote === "away").reduce((s, l) => s + pts(l), 0);
    const parfait = !inconnus.length && m.home_score != null && m.away_score != null && totalDom === m.home_score && totalExt === m.away_score;

    // tout colle et rien n'a encore été saisi à la main : on enregistre directement
    if (auto && parfait && !deja) {
      const rows = lignes.map(({ cote, ...l }) => ({ ...l, match_id: matchId, team_id: cote === "home" ? m.home_team_id : m.away_team_id }));
      const { error } = await db.from("player_match_stats").upsert(rows, { onConflict: "match_id,player_id" });
      if (error) return { matchId, etat: "erreur", message: error.message };
      const nFil = await ecrireFil(db, m, filDepuisIA(r.evenements, refs));
      revalidatePath("/", "layout");
      return { matchId, etat: "valide", message: `${rows.length} joueurs enregistrés, ${totalDom}–${totalExt} conforme au score${nFil ? `, fil du match : ${nFil} faits de jeu` : ""}.` };
    }
    const { data: prop, error } = await db.from("ia_propositions").insert({ match_id: matchId, created_by: viewer.id, lignes, inconnus, evenements: filDepuisIA(r.evenements, refs), remarques: r.remarques || null }).select("id").single();
    if (error) return { matchId, etat: "erreur", message: error.message };
    const pourquoi = deja ? "déjà saisi, à comparer" : inconnus.length ? `${inconnus.length} joueur(s) non reconnu(s)` : `${totalDom}–${totalExt} relevé pour ${m.home_score}–${m.away_score} officiel`;
    return { matchId, etat: deja ? "deja" : "proposition", message: `À vérifier : ${pourquoi}.`, propId: prop.id };
  } catch (e) {
    return { matchId, etat: "erreur", message: (e as Error).message ?? "Erreur inattendue." };
  }
}
