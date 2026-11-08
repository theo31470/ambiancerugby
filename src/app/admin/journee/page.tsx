import Link from "next/link";
import Notice from "@/components/admin/Notice";
import TeamBadge from "@/components/TeamBadge";
import { saveJournee } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { POSITIONS, fmtDay } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const metadata = { title: "Saisie de journée" };

type Joueur = { id: string; first_name: string; last_name: string; position: string | null; team_id: string | null; in_squad: boolean };
type Ligne = { player_id: string; team_id: string; tries: number; conversions: number; penalty_goals: number; drop_goals: number; yellow: number; red: number; minutes: number | null };

const CHAMPS: [keyof Ligne, string, string][] = [
  ["tries", "E", "Essais"],
  ["conversions", "T", "Transformations réussies"],
  ["penalty_goals", "P", "Pénalités réussies"],
  ["drop_goals", "D", "Drops réussis"],
  ["yellow", "CJ", "Cartons jaunes"],
  ["red", "CR", "Cartons rouges"],
  ["minutes", "Min", "Minutes jouées (facultatif)"],
];
const ORDRE = Object.keys(POSITIONS);
const pts = (l: Pick<Ligne, "tries" | "conversions" | "penalty_goals" | "drop_goals">) => 5 * l.tries + 2 * l.conversions + 3 * l.penalty_goals + 3 * l.drop_goals;

export default async function SaisieJournee({ searchParams }: PageProps<"/admin/journee">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: comps } = await db.from("competitions").select("id,slug,name,current_season,kind").eq("active", true).order("sort_order");
  const comp = (comps ?? []).find((c) => c.slug === sp.comp) ?? (comps ?? [])[0];
  if (!comp) return <p>Aucune compétition active.</p>;

  // journées de la saison, dans l'ordre chronologique
  const { data: tous } = await db.from("matches").select("round,kickoff_at,status").eq("competition_id", comp.id).eq("season", comp.current_season).order("kickoff_at");
  const journees: string[] = [];
  for (const m of tous ?? []) { const r = m.round ?? fmtDay(m.kickoff_at); if (!journees.includes(r)) journees.push(r); }
  const derniereJouee = [...(tous ?? [])].reverse().find((m) => m.status === "finished");
  const journee = typeof sp.j === "string" && journees.includes(sp.j) ? sp.j : (derniereJouee ? derniereJouee.round ?? fmtDay(derniereJouee.kickoff_at) : journees[0]);

  const { data: mData } = await db.from("matches").select(MATCH_SELECT).eq("competition_id", comp.id).eq("season", comp.current_season).order("kickoff_at");
  const matchs = ((mData ?? []) as unknown as MatchFull[]).filter((m) => (m.round ?? fmtDay(m.kickoff_at)) === journee);
  const teamIds = [...new Set(matchs.flatMap((m) => [m.home_team_id, m.away_team_id]))];
  const [{ data: jData }, { data: sData }] = await Promise.all([
    teamIds.length ? db.from("players").select("id,first_name,last_name,position,team_id,in_squad").in("team_id", teamIds).order("last_name") : Promise.resolve({ data: [] }),
    matchs.length ? db.from("player_match_stats").select("player_id,team_id,match_id,tries,conversions,penalty_goals,drop_goals,yellow,red,minutes").in("match_id", matchs.map((m) => m.id)) : Promise.resolve({ data: [] }),
  ]);
  const joueurs = (jData ?? []) as Joueur[];
  const lignes = (sData ?? []) as (Ligne & { match_id: string })[];
  const idx = journees.indexOf(journee);
  const lien = (j: string) => `/admin/journee?comp=${comp.slug}&j=${encodeURIComponent(j)}`;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Saisie de journée</h1>
      <p className="mt-1 text-sourdine max-w-prose">Tapez les marqueurs et les cartons de chaque match. Points, stats de saison, classements des buteurs et notes se mettent à jour tout seuls. Le contrôle compare vos points au score officiel.</p>
      <div className="mt-5"><Notice sp={sp} /></div>

      <form className="flex flex-wrap items-end gap-2 mb-2" method="get">
        <label className="grid gap-1 text-sm font-semibold">Compétition
          <select name="comp" defaultValue={comp.slug} className="champ">
            {(comps ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <button className="bouton-discret">Afficher</button>
      </form>

      {journees.length > 0 && (
        <nav aria-label="Journée" className="flex items-center gap-2 my-5">
          {idx > 0 && <Link href={lien(journees[idx - 1])} className="bouton-discret" aria-label="Journée précédente">‹</Link>}
          <div className="defile-scroll flex gap-1 overflow-x-auto">
            {journees.map((j) => (
              <Link key={j} href={lien(j)} aria-current={j === journee ? "page" : undefined}
                className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold ${j === journee ? "bg-encre text-fond" : "hover:bg-teinte"}`}>
                {/^\d+$/.test(j) ? `J${j}` : j}
              </Link>
            ))}
          </div>
          {idx < journees.length - 1 && <Link href={lien(journees[idx + 1])} className="bouton-discret" aria-label="Journée suivante">›</Link>}
        </nav>
      )}

      {matchs.length === 0 ? <p className="text-sourdine">Aucun match pour cette journée.</p> : (
        <div className="grid gap-6">
          {matchs.map((m) => {
            const du = lignes.filter((l) => l.match_id === m.id);
            const fini = m.status === "finished";
            return (
              <section key={m.id} id={`m-${m.id}`} className="bg-surface border border-trait rounded-2xl p-4 sm:p-5 scroll-mt-24">
                <header className="flex flex-wrap items-center gap-3">
                  <TeamBadge team={m.home} size="sm" />
                  <h2 className="titre font-extrabold text-lg">
                    {m.home.short_name ?? m.home.name} <span className="tnum">{m.home_score ?? "–"} – {m.away_score ?? "–"}</span> {m.away.short_name ?? m.away.name}
                  </h2>
                  <TeamBadge team={m.away} size="sm" />
                  <span className="text-sm text-sourdine ml-auto">{fini ? "Terminé" : fmtDay(m.kickoff_at)}</span>
                  <Link href={`/admin/matchs/${m.id}/stats`} className="text-sm underline underline-offset-4 text-sourdine">Feuille détaillée</Link>
                </header>
                <form action={saveJournee} className="mt-4">
                  <input type="hidden" name="match_id" value={m.id} />
                  <input type="hidden" name="_back" value={`${lien(journee)}#m-${m.id}`} />
                  <div className="grid gap-5 lg:grid-cols-2">
                    {(["home", "away"] as const).map((cote) => {
                      const team = m[cote];
                      const officiel = cote === "home" ? m.home_score : m.away_score;
                      const deja = du.filter((l) => l.team_id === team.id);
                      const effectif = joueurs.filter((j) => j.team_id === team.id && (j.in_squad || deja.some((d) => d.player_id === j.id)))
                        .sort((a, b) => ORDRE.indexOf(a.position ?? "") - ORDRE.indexOf(b.position ?? "") || a.last_name.localeCompare(b.last_name, "fr"));
                      const vides = Math.max(3, 7 - deja.length);
                      const total = deja.reduce((s, l) => s + pts(l), 0);
                      const lignesForm = [...deja, ...Array.from({ length: vides }, () => null)];
                      return (
                        <fieldset key={cote} className="min-w-0">
                          <legend className="font-bold flex items-center gap-2 mb-2">{team.name}
                            {deja.length > 0 && officiel != null && (
                              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${total === officiel ? "bg-ok/15 text-ok" : "bg-alerte/15 text-alerte"}`}>
                                {total === officiel ? `✓ ${total} pts` : `${total} pts saisis / ${officiel}`}
                              </span>
                            )}
                          </legend>
                          <input type="hidden" name={`${cote}.team`} value={team.id} />
                          <input type="hidden" name={`${cote}.n`} value={lignesForm.length} />
                          {effectif.length === 0 ? (
                            <p className="text-sm text-sourdine">Pas encore de joueurs pour ce club. <Link href="/admin/donnees" className="underline">Lancer la mise à jour des effectifs</Link></p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="text-sm tnum w-full">
                                <thead>
                                  <tr className="text-xs text-sourdine">
                                    <th className="text-left font-semibold pb-1">Joueur</th>
                                    {CHAMPS.map(([, c, t]) => <th key={c} className="font-semibold pb-1 px-0.5" title={t}>{c}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {lignesForm.map((l, i) => (
                                    <tr key={i}>
                                      <td className="pr-1 py-0.5">
                                        <select name={`${cote}.${i}.p`} defaultValue={l?.player_id ?? ""} aria-label={`Joueur, ligne ${i + 1}`} className="champ !py-1 !px-2 w-full min-w-[10rem] text-sm">
                                          <option value="">–</option>
                                          {ORDRE.map((pos) => {
                                            const liste = effectif.filter((j) => j.position === pos);
                                            return liste.length ? (
                                              <optgroup key={pos} label={POSITIONS[pos]}>
                                                {liste.map((j) => <option key={j.id} value={j.id}>{j.last_name} {j.first_name}</option>)}
                                              </optgroup>
                                            ) : null;
                                          })}
                                          {effectif.some((j) => !j.position) && (
                                            <optgroup label="Poste inconnu">
                                              {effectif.filter((j) => !j.position).map((j) => <option key={j.id} value={j.id}>{j.last_name} {j.first_name}</option>)}
                                            </optgroup>
                                          )}
                                        </select>
                                      </td>
                                      {CHAMPS.map(([f, c, t]) => (
                                        <td key={f} className="px-0.5 py-0.5">
                                          <input name={`${cote}.${i}.${f}`} inputMode="numeric" defaultValue={l && (l[f] ?? 0) !== 0 ? String(l[f]) : ""} aria-label={`${t}, ligne ${i + 1}`}
                                            className={`${f === "minutes" ? "w-12" : "w-9"} rounded border border-trait bg-fond px-1 py-1 text-center`} />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </fieldset>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button className="bouton">Enregistrer ce match</button>
                    <span className="text-xs text-sourdine">Une ligne vidée est supprimée. Il manque des lignes ? Enregistrez : trois lignes vides de plus apparaissent.</span>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
