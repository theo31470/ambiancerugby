"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, getViewer } from "@/lib/supabase/server";
import { analyserFeuille, chercherFeuille, IA_MODELE, IA_PLAFOND_MOIS_USD } from "@/lib/ia";
import { fmtDay } from "@/lib/format";
import { ecrireFil, filDepuisIA } from "@/lib/fil";
import { importerFeuilleWr, SELECT_MATCH_WR, type MatchWr } from "@/lib/feuilles/worldrugby";
import { importerFeuilleEspn, type MatchLocal } from "@/lib/feuilles/espn";
import { importerFeuilleLnr, SELECT_MATCH_FEUILLE } from "@/lib/feuilles/lnr";

export type EtatRecherche = { matchId: string; etat: "valide" | "proposition" | "rien" | "erreur" | "deja"; message: string; propId?: string };

const LNR: Record<string, string> = { "top-14": "https://top14.lnr.fr", "pro-d2": "https://prod2.lnr.fr" };
const normer = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const VIDES = new Set(["stade", "rugby", "club", "union", "section", "olympique", "racing", "provence", "pays", "sporting"]);

/** Texte de la feuille de match LNR (page du match et ses statistiques), retrouvée dans le calendrier de la journée. */
async function texteLnr(base: string, saison: string, journee: string, dom: string, ext: string) {
  const get = (u: string) => fetch(u, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "Mozilla/5.0 AmbianceRugby" } }).then((x) => (x.ok ? x.text() : ""));
  const cal = await get(`${base}/calendrier-et-resultats/${saison}/j${journee}`);
  const liens = [...new Set([...cal.matchAll(/\/feuille-de-match\/[a-z0-9\-/]+/g)].map((x) => x[0].split("/").slice(0, 5).join("/")))];
  const mots = (n: string) => normer(n).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !VIDES.has(w));
  const colle = (n: string, slug: string) => mots(n).some((w) => slug.split("-").some((t) => t.length >= 3 && (w.startsWith(t) || t.startsWith(w))));
  const lien = liens.find((l) => { const sl = l.split("/").pop() ?? ""; return colle(dom, sl) && colle(ext, sl); });
  if (!lien) return null;
  const texte = (h: string) => h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const [page, stats] = await Promise.all([get(base + lien), get(`${base}${lien}/statistiques-du-match`)]);
  const t = `${texte(page)}\n\nSTATISTIQUES : ${texte(stats)}`.trim();
  return t.length > 500 ? t : null;
}

const pts = (l: { tries: number; conversions: number; penalty_goals: number; drop_goals: number }) => 5 * l.tries + 2 * l.conversions + 3 * (l.penalty_goals + l.drop_goals);

/**
 * Remplit un match : d'abord la feuille de match publique d'ESPN (compositions, minutes, marqueurs, cartons, gratuit),
 * puis, si ESPN ne couvre pas le match, Claude cherche le compte rendu sur le web.
 */
export async function chercherMatchIA(matchId: string, auto: boolean, remplacer = false): Promise<EtatRecherche> {
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.role === "user") return { matchId, etat: "erreur", message: "Accès réservé à la rédaction." };
    const db = await createClient();

    // 1. feuille officielle de la LNR (Top 14, Pro D2) : compositions, minutes, points, cartons, plaquages, franchissements
    const { data: me } = await db.from("matches").select(SELECT_MATCH_FEUILLE).eq("id", matchId).single();
    let raisonEspn = "";
    const ml = me as unknown as (MatchLocal & { status: string; round: string | null; season: string | null; lnr_url: string | null; competition: { lnr_site: string | null; espn_league: string | null } }) | null;
    if (ml && ml.status === "finished" && ml.competition?.lnr_site) {
      try {
        const r = await importerFeuilleLnr(db, ml, { remplacer });
        await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: r.ok ? `lnr ${r.dom}-${r.ext}` : r.raison }).eq("id", matchId);
        if (r.ok) {
          { revalidatePath("/", "layout"); revalidateTag("donnees", { expire: 0 }); }
          const detail = `${r.joueurs} joueurs (minutes, points, plaquages, cartons)${r.crees ? `, ${r.crees} nouveaux joueurs créés` : ""}${r.fil ? `, ${r.fil} faits de jeu` : ""}`;
          return r.conforme
            ? { matchId, etat: "valide", message: `Feuille LNR : ${detail}. ${r.dom}–${r.ext}, conforme au score.` }
            : { matchId, etat: "proposition", message: `Feuille LNR enregistrée : ${detail}. Score officiel LNR ${r.dom}–${r.ext}, différent du ${ml.home_score}–${ml.away_score} affiché : vérifiez.` };
        }
        if (r.raison === "déjà saisi à la main") return { matchId, etat: "deja", message: "Déjà saisi à la main : cochez « Remplacer les matchs déjà saisis » pour reprendre la feuille LNR." };
        raisonEspn = `LNR : ${r.raison}`;
      } catch (e) {
        raisonEspn = `LNR : ${(e as Error).message}`;
      }
    }

    // 2. feuille World Rugby (stats complètes), hors Top 14 / Pro D2
    if (me && (me as { status: string }).status === "finished" && !ml?.competition?.lnr_site) {
      try {
        const { data: mw } = await db.from("matches").select(SELECT_MATCH_WR).eq("id", matchId).single();
        const r = mw ? await importerFeuilleWr(db, mw as unknown as MatchWr, { remplacer }) : { ok: false as const, raison: "match introuvable" };
        if (r.ok) {
          await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: `wr ${r.dom}-${r.ext}`, stats_wr_at: new Date().toISOString(), stats_wr_resultat: `wr ${r.joueurs} joueurs` }).eq("id", matchId);
          { revalidatePath("/", "layout"); revalidateTag("donnees", { expire: 0 }); }
          const detail = `${r.joueurs} joueurs (compositions, minutes, points, cartons et toutes les stats détaillées)${r.crees ? `, ${r.crees} nouveaux joueurs créés` : ""}${r.fil ? `, ${r.fil} faits de jeu` : ""}`;
          return r.conforme
            ? { matchId, etat: "valide", message: `Feuille World Rugby : ${detail}. ${r.dom}–${r.ext}, conforme au score.` }
            : { matchId, etat: "proposition", message: `Feuille World Rugby enregistrée : ${detail}. Score World Rugby ${r.dom}–${r.ext} pour ${(me as { home_score: number }).home_score}–${(me as { away_score: number }).away_score} affiché : vérifiez.` };
        }
        if (r.raison.startsWith("déjà saisi")) return { matchId, etat: "deja", message: "Déjà saisi à la main : cochez « Remplacer les matchs déjà saisis » pour reprendre la feuille World Rugby." };
        raisonEspn = [raisonEspn, `World Rugby : ${r.raison}`].filter(Boolean).join(". ");
      } catch (e) {
        raisonEspn = [raisonEspn, `World Rugby : ${(e as Error).message}`].filter(Boolean).join(". ");
      }
    }

    // 3. feuille de match ESPN (secours)
    if (me && (me as { status: string }).status === "finished" && (me as unknown as MatchLocal).competition?.espn_league) {
      try {
        const r = await importerFeuilleEspn(db, me as unknown as MatchLocal, { remplacer });
        await db.from("matches").update({ feuille_tentee_at: new Date().toISOString(), feuille_resultat: r.ok ? `espn ${r.dom}-${r.ext}` : r.raison }).eq("id", matchId);
        if (r.ok) {
          { revalidatePath("/", "layout"); revalidateTag("donnees", { expire: 0 }); }
          const detail = `${r.joueurs} joueurs (compositions, minutes, points, cartons)${r.crees ? `, ${r.crees} nouveaux joueurs créés` : ""}${r.fil ? `, ${r.fil} faits de jeu` : ""}`;
          return r.conforme
            ? { matchId, etat: "valide", message: `Feuille ESPN : ${detail}. ${r.dom}–${r.ext}, conforme au score.` }
            : { matchId, etat: "proposition", message: `Feuille ESPN enregistrée : ${detail}. Points relevés ${r.dom}–${r.ext} pour ${(me as { home_score: number }).home_score}–${(me as { away_score: number }).away_score} affiché : vérifiez le score ou les buteurs.` };
        }
        if (r.raison === "déjà saisi à la main") return { matchId, etat: "deja", message: "Déjà saisi à la main : cochez « Remplacer les matchs déjà saisis » pour reprendre la feuille ESPN." };
        raisonEspn = [raisonEspn, `ESPN : ${r.raison}`].filter(Boolean).join(". ");
      } catch (e) {
        raisonEspn = [raisonEspn, `ESPN : ${(e as Error).message}`].filter(Boolean).join(". ");
      }
    }

    const { data: depense } = await db.rpc("ia_depense_mois");
    if (Number(depense ?? 0) >= IA_PLAFOND_MOIS_USD) return { matchId, etat: "erreur", message: "Plafond mensuel atteint : la recherche revient le 1er du mois." };

    const { data: m } = await db.from("matches")
      .select("id, status, kickoff_at, home_score, away_score, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name), competition:competitions(name, slug), round, season")
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
    let source = "recherche web";
    try {
      // feuille de match officielle de la LNR (Top 14, Pro D2) : le site la récupère, Claude la lit
      const slug = (m.competition as unknown as { slug: string } | null)?.slug ?? "";
      const texte = LNR[slug] && m.round && /^\d+$/.test(String(m.round)) ? await texteLnr(LNR[slug], String(m.season), String(m.round), nom(m.home), nom(m.away)).catch(() => null) : null;
      if (texte) {
        const lu = await analyserFeuille({
          domicile: nom(m.home), exterieur: nom(m.away), scoreDom: m.home_score, scoreExt: m.away_score,
          effectifDom: effectif(m.home_team_id, "H"), effectifExt: effectif(m.away_team_id, "A"), texte, image: null,
        });
        if (lu.lignes.length) { r = { ...lu, recherches: 0 }; source = "feuille LNR"; refs.clear(); effectif(m.home_team_id, "H"); effectif(m.away_team_id, "A"); }
      }
      if (!r) r = await chercherFeuille({
        domicile: nom(m.home), exterieur: nom(m.away), competition: nom(m.competition),
        date: fmtDay(m.kickoff_at, { day: "numeric", month: "long", year: "numeric" }),
        scoreDom: m.home_score, scoreExt: m.away_score,
        effectifDom: effectif(m.home_team_id, "H"), effectifExt: effectif(m.away_team_id, "A"),
      });
    } catch (e) {
      await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, ok: false, message: (e as Error).message.slice(0, 300) });
      return { matchId, etat: "erreur", message: (e as Error).message };
    }
    await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.coutUsd, message: source === "feuille LNR" ? source : `recherche web (${r.recherches})` });

    const lignes = r.lignes.filter((l) => l.ref && refs.has(l.ref) && (l.ref.startsWith("H") ? l.equipe === "home" : l.equipe === "away"))
      .map((l) => ({ cote: l.equipe, player_id: refs.get(l.ref!)!, tries: l.essais, conversions: l.transformations, penalty_goals: l.penalites, drop_goals: l.drops, yellow: l.cartons_jaunes, red: l.cartons_rouges }));
    const inconnus = r.lignes.filter((l) => !l.ref || !refs.has(l.ref)).map((l) => ({ cote: l.equipe, nom: l.nom_lu, essais: l.essais, transformations: l.transformations, penalites: l.penalites, drops: l.drops, cj: l.cartons_jaunes, cr: l.cartons_rouges }));
    if (!lignes.length && !inconnus.length) return { matchId, etat: "rien", message: `${raisonEspn ? `${raisonEspn}. ` : ""}Claude : ${r.remarques || "aucun compte rendu trouvé."}` };

    const totalDom = lignes.filter((l) => l.cote === "home").reduce((s, l) => s + pts(l), 0);
    const totalExt = lignes.filter((l) => l.cote === "away").reduce((s, l) => s + pts(l), 0);
    const parfait = !inconnus.length && m.home_score != null && m.away_score != null && totalDom === m.home_score && totalExt === m.away_score;

    // tout colle et rien n'a encore été saisi à la main : on enregistre directement
    if (auto && parfait && !deja) {
      const rows = lignes.map(({ cote, ...l }) => ({ ...l, match_id: matchId, team_id: cote === "home" ? m.home_team_id : m.away_team_id }));
      const { error } = await db.from("player_match_stats").upsert(rows, { onConflict: "match_id,player_id" });
      if (error) return { matchId, etat: "erreur", message: error.message };
      const nFil = await ecrireFil(db, m, filDepuisIA(r.evenements, refs));
      { revalidatePath("/", "layout"); revalidateTag("donnees", { expire: 0 }); }
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
