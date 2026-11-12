import { publicClient } from "@/lib/supabase/server";
import { getMatch } from "@/lib/queries";

/**
 * Tout ce qu'il faut pour raconter un match le lendemain, uniquement avec les données du site :
 * marqueurs, notes, chiffres d'équipe, courbe d'ascendant, histoire des confrontations et Indice Ambiance.
 */
export type Cote = "home" | "away";
export type EquipeVisuel = { id: string; nom: string; court: string; logo: string | null; couleur: string | null };
export type JoueurNote = { cote: Cote; nom: string; prenom: string; photo: string | null; note: number; motm: boolean; numero: number | null; essais: number; points: number; plaquages: number; franchissements: number; minutes: number | null };
export type ChiffresEquipe = { essais: number; transformations: number; penalites: number; drops: number; jaunes: number; rouges: number; plaquages: number; franchissements: number; offloads: number; grattages: number; mt1: number | null; mt2: number | null };
export type Marqueur = { cote: Cote; nom: string; minute: number | null; type: string };
export type ApresMatch = {
  id: string; competition: string; saison: string; journee: string | null; date: string;
  dom: EquipeVisuel; ext: EquipeVisuel; scoreDom: number; scoreExt: number;
  marqueurs: Marqueur[];
  notes: JoueurNote[];
  chiffres: Record<Cote, ChiffresEquipe>;
  detail: boolean;
  evenements: { minute: number; kind: string; cote: Cote }[];
  histoire: { matchs: number; vDom: number; vExt: number; nuls: number; premiere: string | null; serie: { cote: Cote | null; n: number }; plusLarge: { ecart: number; date: string; score: string } | null; precedent: { date: string; score: string; vainqueur: Cote | null } | null };
  indice: Record<Cote, { avant: number; apres: number; delta: number; rang: number | null } | null>;
};

const vide = (): ChiffresEquipe => ({ essais: 0, transformations: 0, penalites: 0, drops: 0, jaunes: 0, rouges: 0, plaquages: 0, franchissements: 0, offloads: 0, grattages: 0, mt1: null, mt2: null });
const equipe = (t: { id: string; name: string; short_name: string | null; logo_url: string | null; color: string | null }): EquipeVisuel => ({ id: t.id, nom: t.name, court: t.short_name ?? t.name, logo: t.logo_url, couleur: t.color });

export async function donneesApresMatch(param: string): Promise<ApresMatch | null> {
  const m = await getMatch(param);
  if (!m || m.home_score == null || m.away_score == null) return null;
  const db = publicClient();
  const cote = (teamId: string | null): Cote => (teamId === m.away_team_id ? "away" : "home");

  const [{ data: stats }, { data: evts }, { data: passes }, { data: indices }, { data: rangs }] = await Promise.all([
    db.from("player_match_stats")
      .select("team_id,minutes,tries,points,tackles,line_breaks,offloads,turnovers_won,yellow,red,motm,rating,conversions,penalty_goals,drop_goals,numero, player:players(first_name,last_name,photo_url)")
      .eq("match_id", m.id),
    db.from("match_events").select("minute,kind,team_id, player:players(first_name,last_name)").eq("match_id", m.id).order("minute"),
    // toutes les confrontations précédentes, toutes compétitions, dans les deux sens
    db.from("matches").select("kickoff_at,home_team_id,away_team_id,home_score,away_score")
      .eq("status", "finished").lt("kickoff_at", m.kickoff_at)
      .or(`and(home_team_id.eq.${m.home_team_id},away_team_id.eq.${m.away_team_id}),and(home_team_id.eq.${m.away_team_id},away_team_id.eq.${m.home_team_id})`)
      .order("kickoff_at", { ascending: false }).limit(200),
    db.from("rating_history").select("team_id,rating,delta").eq("match_id", m.id),
    db.from("team_ratings").select("team_id,rank").in("team_id", [m.home_team_id, m.away_team_id]),
  ]);

  type L = { team_id: string; minutes: number | null; tries: number; points: number; tackles: number | null; line_breaks: number | null; offloads: number | null; turnovers_won: number | null; yellow: number | null; red: number | null; motm: boolean; rating: number | null; conversions: number | null; penalty_goals: number | null; drop_goals: number | null; numero: number | null; player: { first_name: string; last_name: string; photo_url: string | null } | null };
  const lignes = (stats ?? []) as unknown as L[];
  const chiffres: Record<Cote, ChiffresEquipe> = { home: vide(), away: vide() };
  for (const l of lignes) {
    const c = chiffres[cote(l.team_id)];
    c.essais += l.tries || 0; c.transformations += l.conversions || 0; c.penalites += l.penalty_goals || 0; c.drops += l.drop_goals || 0;
    c.jaunes += l.yellow || 0; c.rouges += l.red || 0; c.plaquages += l.tackles || 0; c.franchissements += l.line_breaks || 0;
    c.offloads += l.offloads || 0; c.grattages += l.turnovers_won || 0;
  }
  const ls = (m as unknown as { linescores?: { home: number; away: number }[] | null }).linescores;
  if (ls && ls.length >= 2) { chiffres.home.mt1 = ls[0].home; chiffres.away.mt1 = ls[0].away; chiffres.home.mt2 = ls[1].home; chiffres.away.mt2 = ls[1].away; }

  const notes: JoueurNote[] = lignes.filter((l) => l.rating != null && l.player).map((l) => ({
    cote: cote(l.team_id), nom: l.player!.last_name, prenom: l.player!.first_name, photo: l.player!.photo_url,
    note: Number(l.rating), motm: !!l.motm, numero: l.numero, essais: l.tries || 0, points: l.points || 0,
    plaquages: l.tackles || 0, franchissements: l.line_breaks || 0, minutes: l.minutes,
  })).sort((a, b) => Number(b.motm) - Number(a.motm) || b.note - a.note);

  type E = { minute: number | null; kind: string; team_id: string | null; player: { first_name: string; last_name: string } | null };
  const evenements = ((evts ?? []) as unknown as E[]);
  const marqueurs: Marqueur[] = evenements.filter((e) => ["try", "penalty_try"].includes(e.kind))
    .map((e) => ({ cote: cote(e.team_id), nom: e.kind === "penalty_try" ? "Essai de pénalité" : e.player ? `${e.player.first_name.slice(0, 1)}. ${e.player.last_name}` : "Essai", minute: e.minute, type: e.kind }));

  // histoire des confrontations (vu du côté de l'équipe qui reçoit ce match-ci)
  const liste = (passes ?? []).filter((p) => p.home_score != null && p.away_score != null);
  let vDom = 0, vExt = 0, nuls = 0;
  let plusLarge: ApresMatch["histoire"]["plusLarge"] = null;
  const gagnant = (p: (typeof liste)[number]): Cote | null => {
    if (p.home_score === p.away_score) return null;
    const domGagne = p.home_score! > p.away_score!;
    return (p.home_team_id === m.home_team_id) === domGagne ? "home" : "away";
  };
  for (const p of liste) {
    const g = gagnant(p);
    if (g === "home") vDom++; else if (g === "away") vExt++; else nuls++;
    const ecart = Math.abs(p.home_score! - p.away_score!);
    if (g === "home" && (!plusLarge || ecart > plusLarge.ecart)) plusLarge = { ecart, date: p.kickoff_at, score: `${p.home_score}-${p.away_score}` };
  }
  // série en cours, ce match compris
  const resultatDuJour: Cote | null = m.home_score === m.away_score ? null : m.home_score > m.away_score ? "home" : "away";
  let serie = { cote: resultatDuJour, n: 1 };
  for (const p of liste) { if (gagnant(p) === serie.cote) serie.n++; else break; }
  if (serie.cote === null) serie = { cote: null, n: 0 };
  const prec = liste[0];

  const indice: ApresMatch["indice"] = { home: null, away: null };
  for (const r of indices ?? []) {
    const c = cote(r.team_id as string);
    indice[c] = { apres: Number(r.rating), avant: Number(r.rating) - Number(r.delta), delta: Number(r.delta), rang: (rangs ?? []).find((x) => x.team_id === r.team_id)?.rank ?? null };
  }

  return {
    id: m.id, competition: m.competition.name, saison: m.season, journee: m.round, date: m.kickoff_at,
    dom: equipe(m.home), ext: equipe(m.away), scoreDom: m.home_score, scoreExt: m.away_score,
    marqueurs, notes, chiffres, detail: chiffres.home.plaquages + chiffres.away.plaquages > 0,
    evenements: evenements.filter((e) => e.minute != null && e.team_id).map((e) => ({ minute: e.minute!, kind: e.kind, cote: cote(e.team_id) })),
    histoire: {
      matchs: liste.length, vDom, vExt, nuls, premiere: liste.at(-1)?.kickoff_at ?? null, serie, plusLarge,
      precedent: prec ? { date: prec.kickoff_at, score: prec.home_team_id === m.home_team_id ? `${prec.home_score}-${prec.away_score}` : `${prec.away_score}-${prec.home_score}`, vainqueur: gagnant(prec) } : null,
    },
    indice,
  };
}

/** Domination minute par minute (même calcul que la courbe d'ascendant du site). */
export function courbe(evts: ApresMatch["evenements"], fin = 80) {
  const POIDS: Record<string, number> = { try: 6, penalty_try: 8, conversion: 1.2, penalty: 3, drop: 3.5, yellow: -3.5, red: -6 };
  const utiles = evts.filter((e) => POIDS[e.kind] !== undefined);
  const valeurs: number[] = [];
  for (let t = 0; t <= Math.max(fin, ...utiles.map((e) => e.minute)); t += 0.5) {
    let v = 0;
    for (const e of utiles) if (t >= e.minute) v += (e.cote === "home" ? 1 : -1) * POIDS[e.kind] * Math.exp(-(t - e.minute) / 7);
    valeurs.push(v);
  }
  const dom = valeurs.filter((v) => v > 0.8).length, ext = valeurs.filter((v) => v < -0.8).length;
  return { valeurs, pctDom: Math.round((dom / Math.max(1, dom + ext)) * 100) };
}
