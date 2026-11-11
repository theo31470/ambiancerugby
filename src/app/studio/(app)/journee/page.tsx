import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import TeamBadge from "@/components/TeamBadge";
import { analyserMatch, saveJournee } from "../actions";
import { IA_PLAFOND_MOIS_USD } from "@/lib/ia";
import RechercheJournee, { RechercheMatch } from "@/components/admin/RechercheIA";
import { createClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { POSITIONS, fmtDay } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const metadata = { title: "Saisie de journée" };
// la recherche web de Claude peut prendre une minute par match
export const maxDuration = 120;

type Joueur = { id: string; first_name: string; last_name: string; position: string | null; team_id: string | null; in_squad: boolean };
type Proposition = {
  id: string; match_id: string; remarques: string | null; evenements: unknown[];
  lignes: { cote: "home" | "away"; player_id: string; tries: number; conversions: number; penalty_goals: number; drop_goals: number; yellow: number; red: number }[];
  inconnus: { cote: "home" | "away"; nom: string; essais: number; transformations: number; penalites: number; drops: number; cj: number; cr: number }[];
};
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

export default async function SaisieJournee({ searchParams }: PageProps<"/studio/journee">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: comps } = await db.from("competitions").select("id,slug,name,current_season,kind").eq("active", true).order("sort_order");
  const comp = (comps ?? []).find((c) => c.slug === sp.comp) ?? (comps ?? [])[0];
  if (!comp) return <p>Aucune compétition active.</p>;

  // saison en cours ou passées (rattrapage)
  const { data: sData0 } = await db.from("team_competitions").select("season").eq("competition_id", comp.id);
  const saisons = [...new Set([comp.current_season, ...(sData0 ?? []).map((x) => x.season as string)])].sort((a, b) => b.localeCompare(a));
  const saison = typeof sp.saison === "string" && saisons.includes(sp.saison) ? sp.saison : comp.current_season;

  // journées de la saison, dans l'ordre chronologique
  const { data: tous } = await db.from("matches").select("round,kickoff_at,status").eq("competition_id", comp.id).eq("season", saison).order("kickoff_at");
  const journees: string[] = [];
  for (const m of tous ?? []) { const r = m.round ?? fmtDay(m.kickoff_at); if (!journees.includes(r)) journees.push(r); }
  const derniereJouee = [...(tous ?? [])].reverse().find((m) => m.status === "finished");
  const journee = typeof sp.j === "string" && journees.includes(sp.j) ? sp.j : (derniereJouee ? derniereJouee.round ?? fmtDay(derniereJouee.kickoff_at) : journees[0]);

  const { data: mData } = await db.from("matches").select(MATCH_SELECT).eq("competition_id", comp.id).eq("season", saison).order("kickoff_at");
  const matchs = ((mData ?? []) as unknown as MatchFull[]).filter((m) => (m.round ?? fmtDay(m.kickoff_at)) === journee);
  const teamIds = [...new Set(matchs.flatMap((m) => [m.home_team_id, m.away_team_id]))];
  const [{ data: jData }, { data: sData }] = await Promise.all([
    teamIds.length ? db.from("players").select("id,first_name,last_name,position,team_id,in_squad").in("team_id", teamIds).order("last_name") : Promise.resolve({ data: [] }),
    matchs.length ? db.from("player_match_stats").select("player_id,team_id,match_id,tries,conversions,penalty_goals,drop_goals,yellow,red,minutes").in("match_id", matchs.map((m) => m.id)) : Promise.resolve({ data: [] }),
  ]);
  const joueurs = (jData ?? []) as Joueur[];
  // proposition de Claude à vérifier (après « Remplir avec Claude »)
  const [{ data: propData }, { data: depense }] = await Promise.all([
    typeof sp.ia === "string" && /^[0-9a-f-]{36}$/.test(sp.ia) ? db.from("ia_propositions").select("id, match_id, lignes, inconnus, remarques, evenements").eq("id", sp.ia).maybeSingle() : Promise.resolve({ data: null }),
    db.rpc("ia_depense_mois"),
  ]);
  const prop = propData as Proposition | null;
  const depenseUsd = Number(depense ?? 0);
  const lignes = (sData ?? []) as (Ligne & { match_id: string })[];
  const idx = journees.indexOf(journee);
  const lien = (j: string) => `/studio/journee?comp=${comp.slug}${saison !== comp.current_season ? `&saison=${saison}` : ""}&j=${encodeURIComponent(j)}`;

  return (
    <div>
      <PageHeader titre="Saisie de journée"
        description="Les marqueurs et les cartons de chaque match. Points, stats de saison, classements des buteurs et notes se mettent à jour tout seuls."
        aide={<>
          <p><strong>Le plus rapide :</strong> « Chercher les matchs » en haut de la journée. Claude trouve les comptes rendus dans la presse et enregistre seul les matchs dont le total colle au score officiel.</p>
          <p><strong>Pour un match :</strong> ouvrez « Remplir avec Claude », puis « Chercher sur le web », ou collez un compte rendu ou une photo de la feuille de match.</p>
          <p><strong>À la main :</strong> choisissez le joueur, tapez les chiffres, « Enregistrer ce match ». La pastille verte confirme que le total colle au score.</p>
          <p>Pour rattraper une saison passée, changez la saison en haut.</p>
        </>} />
      <p className="mt-2 text-xs text-sourdine tnum">Saisie assistée par Claude ce mois-ci : {depenseUsd.toLocaleString("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 })} sur un plafond de {IA_PLAFOND_MOIS_USD} $ (environ {Math.round(IA_PLAFOND_MOIS_USD * 0.93)} €).</p>
      <div className="mt-5"><Notice sp={sp} /></div>

      <form className="flex flex-wrap items-end gap-2 mb-2" method="get">
        <label className="grid gap-1 text-sm font-semibold">Compétition
          <select name="comp" defaultValue={comp.slug} className="champ">
            {(comps ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        {saisons.length > 1 && (
          <label className="grid gap-1 text-sm font-semibold">Saison
            <select name="saison" defaultValue={saison} className="champ">
              {saisons.map((x) => <option key={x} value={x}>{x}{x === comp.current_season ? " (en cours)" : ""}</option>)}
            </select>
          </label>
        )}
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
          <RechercheJournee lien={lien(journee)} matchs={matchs.filter((m) => m.status === "finished").map((m) => ({
            id: m.id, label: `${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}`, saisi: lignes.some((l) => l.match_id === m.id),
          }))} />
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
                  <Link href={`/studio/matchs/${m.id}/stats`} className="text-sm underline underline-offset-4 text-sourdine">Feuille détaillée</Link>
                </header>
                <details className="mt-3 rounded-xl border border-dashed border-vin/40 bg-teinte/40 open:bg-teinte">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-vin">Remplir avec Claude</summary>
                  {fini && (
                    <div className="px-3 pb-2">
                      <RechercheMatch matchId={m.id} lien={lien(journee)} />
                      <p className="mt-1 text-xs text-sourdine">Claude cherche lui-même un compte rendu dans la presse. Ou collez le vôtre :</p>
                    </div>
                  )}
                  <form action={analyserMatch} className="px-3 pb-3 grid gap-2">
                    <input type="hidden" name="match_id" value={m.id} />
                    <input type="hidden" name="_back" value={`${lien(journee)}#m-${m.id}`} />
                    <label className="grid gap-1 text-sm">Compte rendu du match (marqueurs, cartons…)
                      <textarea name="texte" rows={4} className="champ text-sm" placeholder="Collez ici le compte rendu ou la feuille de match que vous avez consultée." />
                    </label>
                    <label className="grid gap-1 text-sm">Ou une photo / capture de la feuille de match
                      <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="bouton-discret">Analyser</button>
                      <span className="text-xs text-sourdine">Claude propose, vous vérifiez, rien n&apos;est enregistré sans vous. Moins d&apos;un centime par match.</span>
                    </div>
                  </form>
                </details>
                {prop?.match_id === m.id && (
                  <div role="status" className="mt-4 rounded-xl bg-moutarde/20 border border-moutarde p-3 text-sm">
                    <p className="font-semibold">Proposition de Claude pré-remplie ci-dessous : vérifiez puis cliquez sur « Enregistrer ce match ».</p>
                    {prop.remarques && <p className="mt-1">{prop.remarques}</p>}
                    {prop.evenements.length > 0 && <p className="mt-1">Fil du match : {prop.evenements.length} faits de jeu avec leur minute seront ajoutés à l&apos;enregistrement.</p>}
                    {prop.inconnus.length > 0 && (
                      <div className="mt-2">
                        <p>Joueurs non trouvés dans l&apos;effectif, à choisir à la main dans une ligne vide :</p>
                        <ul className="mt-1 list-disc pl-5">
                          {prop.inconnus.map((x, i) => (
                            <li key={i}>
                              {x.nom} ({x.cote === "home" ? m.home.short_name ?? m.home.name : m.away.short_name ?? m.away.name}) :{" "}
                              {[x.essais && `${x.essais} E`, x.transformations && `${x.transformations} T`, x.penalites && `${x.penalites} P`, x.drops && `${x.drops} D`, x.cj && `${x.cj} CJ`, x.cr && `${x.cr} CR`].filter(Boolean).join(", ") || "rien"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link href={`${lien(journee)}#m-${m.id}`} className="mt-2 inline-block text-xs underline underline-offset-2">Ignorer la proposition</Link>
                  </div>
                )}
                <form action={saveJournee} className="mt-4">
                  <input type="hidden" name="match_id" value={m.id} />
                  <input type="hidden" name="_back" value={`${lien(journee)}#m-${m.id}`} />
                  {prop?.match_id === m.id && <input type="hidden" name="ia_prop" value={prop.id} />}
                  <div className="grid gap-5 lg:grid-cols-2">
                    {(["home", "away"] as const).map((cote) => {
                      const team = m[cote];
                      const officiel = cote === "home" ? m.home_score : m.away_score;
                      const propose = prop?.match_id === m.id
                        ? prop.lignes.filter((l) => l.cote === cote).map((l) => ({ ...l, team_id: team.id, minutes: null as number | null }))
                        : null;
                      const deja = propose ?? du.filter((l) => l.team_id === team.id);
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
                            <p className="text-sm text-sourdine">Pas encore de joueurs pour ce club. <Link href="/studio/donnees" className="underline">Lancer la mise à jour des effectifs</Link></p>
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
