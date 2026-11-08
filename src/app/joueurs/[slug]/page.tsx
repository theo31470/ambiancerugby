/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import FavoriteButton from "@/components/FavoriteButton";
import { Ballon } from "@/components/deco/Icones";
import { getPlayer, TEAM_LITE } from "@/lib/queries";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { POSITIONS, age, fmtDate, fmtDay } from "@/lib/format";
import type { TeamLite } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/joueurs/[slug]">): Promise<Metadata> {
  const p = await getPlayer((await params).slug);
  return p ? { title: `${p.first_name} ${p.last_name} : stats et notes` } : {};
}

type Totaux = { season: string; competition_id: string; games: number; starts: number; minutes: number; tries: number; conversions: number; penalty_goals: number; drop_goals: number; points: number; yellow: number; red: number; tackles: number; carries: number; metres: number; line_breaks: number; turnovers_won: number; motm: number; rating: number | null; games_saisis: number; competition?: { name: string; short_name: string | null; slug: string } };
const CLES = ["games", "starts", "minutes", "tries", "conversions", "penalty_goals", "drop_goals", "points", "yellow", "red", "tackles", "carries", "metres", "line_breaks", "turnovers_won", "motm"] as const;
type Perf = { rating: number; tries: number; points: number; tackles: number; carries: number; metres: number; motm: boolean; match: { id: string; kickoff_at: string; home_score: number | null; away_score: number | null; home: TeamLite; away: TeamLite } };

export default async function JoueurPage({ params }: PageProps<"/joueurs/[slug]">) {
  const { slug } = await params;
  const p = await getPlayer(slug);
  if (!p) notFound();
  const a = age(p.birth_date);
  const db = publicClient();
  const [{ data: seasons }, { data: perfs }, viewer] = await Promise.all([
    db.from("player_season_totals").select("*").eq("player_id", p.id).order("season", { ascending: false }),
    db.from("player_match_stats")
      .select(`rating,tries,points,tackles,carries,metres,motm, match:matches!inner(id,kickoff_at,home_score,away_score, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE}))`)
      .eq("player_id", p.id)
      .order("match(kickoff_at)", { ascending: false })
      .limit(10),
    getViewer(),
  ]);
  const { data: compsData } = await db.from("competitions").select("id,name,short_name,slug");
  const lignes = ((seasons ?? []) as Totaux[]).map((t) => ({ ...t, competition: (compsData ?? []).find((c) => c.id === t.competition_id) }));
  const derniere = lignes[0]?.season;
  const parComp = lignes.filter((t) => t.season === derniere);
  const saison = parComp.length
    ? (() => {
        const tot = Object.fromEntries(CLES.map((k) => [k, parComp.reduce((s, t) => s + (Number(t[k]) || 0), 0)])) as Record<(typeof CLES)[number], number>;
        const notes = parComp.filter((t) => t.rating != null);
        const rating = notes.length ? notes.reduce((s, t) => s + Number(t.rating) * t.games_saisis, 0) / Math.max(1, notes.reduce((s, t) => s + t.games_saisis, 0)) : null;
        return { season: derniere!, ...tot, rating };
      })()
    : undefined;
  const matchs = (perfs ?? []) as unknown as Perf[];
  const full = !!viewer?.supporter;

  const facts: [string, string | null][] = [
    ["Poste", p.position ? POSITIONS[p.position] : null],
    ["Nationalité", p.nationality],
    ["Naissance", p.birth_date ? `${fmtDate(p.birth_date)}${a != null ? ` (${a} ans)` : ""}` : null],
    ["Taille", p.height_cm ? `${(p.height_cm / 100).toFixed(2).replace(".", ",")} m` : null],
    ["Poids", p.weight_kg ? `${p.weight_kg} kg` : null],
    ["Sélections", p.caps != null ? String(p.caps) : null],
    ["Essais en carrière", p.career_tries != null ? String(p.career_tries) : null],
    ["Points en carrière", p.career_points != null ? String(p.career_points) : null],
  ];

  return (
    <div>
      <div className="grid gap-10 md:grid-cols-[17rem_1fr] md:gap-14">
        <div className="relative w-full max-w-64">
          <div className="absolute inset-0 rounded-[1.5rem] bg-moutarde rotate-3" aria-hidden />
          {p.photo_url ? (
            <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} className="relative w-full aspect-[4/5] object-cover rounded-[1.5rem]" />
          ) : (
            <div className="relative w-full aspect-[4/5] rounded-[1.5rem] bg-vin grid place-items-center overflow-hidden" aria-hidden>
              <span className="groovy text-white text-8xl">{p.first_name.slice(0, 1)}{p.last_name.slice(0, 1)}</span>
              {p.number != null && <span className="absolute bottom-3 right-4 groovy text-5xl text-moutarde">{p.number}</span>}
            </div>
          )}
          {p.photo_url && p.photo_source && <p className="relative mt-2 text-[11px] text-sourdine">Photo : {p.photo_source}</p>}
          {saison?.rating != null && (
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-bordeaux text-white grid place-items-center text-center shadow-[0_6px_0_-1px_rgba(0,0,0,.25)] rotate-[-6deg]">
              <span><span className="groovy text-3xl text-moutarde block leading-none">{Number(saison.rating).toFixed(1)}</span><span className="text-[10px] font-semibold">note Ambiance</span></span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sourdine text-lg">{p.first_name}</p>
          <h1 className="groovy text-5xl sm:text-7xl text-vin leading-none">{p.last_name}</h1>
          {p.team && (
            <Link href={`/clubs/${p.team.slug}`} className="mt-4 inline-flex items-center gap-2 font-semibold hover:underline underline-offset-4">
              <TeamBadge team={p.team} size="sm" />
              {p.team.name}
              {p.number != null && <span className="text-sourdine font-normal">, n° {p.number}</span>}
            </Link>
          )}
          <div className="mt-4"><FavoriteButton kind="player" id={p.id} path={`/joueurs/${p.slug}`} /></div>

          <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-2xl">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="border-t-2 border-trait pt-2">
                <dt className="text-sm text-sourdine">{k}</dt>
                <dd className="titre font-bold text-lg tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {p.bio && <p className="mt-8 max-w-prose text-lg whitespace-pre-line">{p.bio}</p>}
          {p.source === "wikipedia" && (
            <p className="mt-6 text-xs text-sourdine">Effectif : <a href="https://en.wikipedia.org" className="underline underline-offset-2">Wikipédia</a>, licence CC BY-SA. Une erreur ? Signalez-la en commentaire d&apos;un article.</p>
          )}
        </div>
      </div>

      <section aria-labelledby="h-saison" className="mt-14">
        <h2 id="h-saison" className="groovy text-3xl text-vin mb-4">Saison {saison?.season ?? ""}</h2>
        {saison ? (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {([
                ["Matchs", saison.games], ["Titulaire", saison.starts], ["Minutes", saison.minutes], ["Essais", saison.tries], ["Points", saison.points],
                ["Transformations", saison.conversions], ["Pénalités", saison.penalty_goals], ["Drops", saison.drop_goals],
                ["Cartons jaunes", saison.yellow], ["Cartons rouges", saison.red],
                ...(saison.tackles ? [["Plaquages", saison.tackles], ["Mètres", saison.metres], ["Ballons grattés", saison.turnovers_won], ["Franchissements", saison.line_breaks]] : []),
                ...(saison.motm ? [["Homme du match", saison.motm]] : []),
              ] as [string, number][]).filter(([k, v]) => v || ["Matchs", "Essais", "Points"].includes(k)).map(([k, v]) => (
                <div key={k} className="carte-vie bg-surface border border-trait rounded-2xl p-4">
                  <dt className="text-xs text-sourdine">{k}</dt>
                  <dd className="titre text-3xl font-extrabold tnum">{v}</dd>
                </div>
              ))}
            </dl>
            {parComp.length > 1 && (
              <div className="mt-5 bg-surface border border-trait rounded-2xl overflow-x-auto">
                <table className="w-full text-sm tnum">
                  <caption className="sr-only">Détail par compétition</caption>
                  <thead><tr className="text-xs text-sourdine border-b border-trait">
                    <th scope="col" className="text-left font-semibold px-4 py-2">Compétition</th>
                    {["MJ", "Min", "E", "T", "P", "D", "Pts", "CJ", "CR"].map((h) => <th key={h} scope="col" className="font-semibold px-2">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {parComp.map((t) => (
                      <tr key={t.competition_id} className="border-b border-trait last:border-0">
                        <th scope="row" className="text-left font-semibold px-4 py-2">{t.competition ? <Link href={`/competitions/${t.competition.slug}`} className="hover:underline underline-offset-4">{t.competition.name}</Link> : "–"}</th>
                        {[t.games, t.minutes, t.tries, t.conversions, t.penalty_goals, t.drop_goals, t.points, t.yellow, t.red].map((v, i) => <td key={i} className="text-center px-2">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface border border-dashed border-trait rounded-2xl p-8 text-center">
            <Ballon className="w-14 mx-auto text-vin" />
            <p className="mt-3 text-sourdine">Pas encore de stats cette saison. Elles arrivent après chaque journée saisie par la rédaction.</p>
          </div>
        )}
      </section>

      {matchs.length > 0 && (
        <section aria-labelledby="h-perfs" className="mt-12">
          <h2 id="h-perfs" className="groovy text-3xl text-vin mb-4">Ses derniers matchs</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {(full ? matchs : matchs.slice(0, 3)).map((x) => (
              <li key={x.match.id}>
                <Link href={`/matchs/${x.match.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-teinte">
                  <span className="text-sm text-sourdine w-24">{fmtDay(x.match.kickoff_at, { day: "numeric", month: "short", year: "2-digit" })}</span>
                  <span className="flex-1 min-w-48 font-semibold">{x.match.home.short_name ?? x.match.home.name} {x.match.home_score}–{x.match.away_score} {x.match.away.short_name ?? x.match.away.name}</span>
                  {full && <span className="text-sm text-sourdine tnum">{x.points} pts, {x.tries} essai{x.tries > 1 ? "s" : ""}{x.tackles ? `, ${x.tackles} plaquages` : ""}</span>}
                  {x.motm && <span className="text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Homme du match</span>}
                  <span className={`min-w-12 text-center rounded-full px-2 py-0.5 titre font-extrabold ${x.rating >= 8 ? "bg-moutarde text-bordeaux" : x.rating >= 6.5 ? "bg-teinte" : "bg-alerte/10 text-alerte"}`}>{Number(x.rating).toFixed(1)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!full && matchs.length > 3 && (
            <p className="mt-3 text-sm">Tout l&apos;historique et le détail des stats sont réservés aux Supporters. <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link></p>
          )}
        </section>
      )}
    </div>
  );
}
