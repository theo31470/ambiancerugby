/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import MatchRow from "@/components/MatchRow";
import StandingsTable, { zonesFor } from "@/components/StandingsTable";
import ArticleCard from "@/components/ArticleCard";
import FavoriteButton from "@/components/FavoriteButton";
import Forme from "@/components/algo/Forme";
import Courbe from "@/components/algo/Courbe";
import { Echarpe } from "@/components/deco/Icones";
import { getArticles, getSquad, getStandings, getTeam, getTeamCompetitions, getTeamMatches } from "@/lib/queries";
import { getForms, getRatingHistory, getRatings } from "@/lib/algo";
import { getViewer } from "@/lib/supabase/server";
import { POSITION_GROUPS, POSITIONS } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const t = await getTeam((await params).slug);
  return t ? { title: `${t.name} : effectif, calendrier, résultats`, description: t.description ?? undefined } : {};
}

export default async function ClubPage({ params }: PageProps<"/clubs/[slug]">) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();

  const [upcoming, results, squad, comps, articles] = await Promise.all([
    getTeamMatches(team.id, { upcoming: true, limit: 5 }),
    getTeamMatches(team.id, { upcoming: false, limit: 5 }),
    getSquad(team.id),
    getTeamCompetitions(team.id),
    getArticles({ teamId: team.id, limit: 4 }),
  ]);
  const league = comps
    .filter((x) => x.competition.kind === "league" && x.season === x.competition.current_season)
    .sort((a, b) => a.competition.sort_order - b.competition.sort_order)[0]?.competition;
  const standings = league ? await getStandings(league.id, league.current_season) : [];
  const [ratings, forms, history, viewer] = await Promise.all([getRatings([team.id]), getForms([team.id]), getRatingHistory(team.id), getViewer()]);
  const rating = ratings.get(team.id);
  const form = forms.get(team.id);
  const full = !!viewer?.supporter;

  return (
    <div>
      <header className="pleine-largeur -mt-6 sm:-mt-10 text-white relative overflow-hidden" style={{ background: `linear-gradient(120deg, var(--bordeaux) 55%, ${team.color ?? "var(--vin)"} 55%)` }}>
        <Echarpe className="absolute right-6 top-6 w-40 h-auto text-white/10 rotate-12 hidden sm:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-wrap items-center gap-6 relative">
          <div className="rounded-full bg-white p-3 shadow-[0_8px_0_-2px_rgba(0,0,0,.25)]"><TeamBadge team={team} size="xl" /></div>
          <div className="min-w-0">
            <h1 className="groovy text-4xl sm:text-6xl leading-none">{team.name}</h1>
            <p className="mt-3 text-white/80">
              {[team.city, team.stadium, team.founded ? `fondé en ${team.founded}` : null].filter(Boolean).join(", ")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {comps.filter((x) => x.season === x.competition.current_season).map((x) => (
                <li key={x.competition.id}>
                  <Link href={`/competitions/${x.competition.slug}`} className="text-xs font-semibold rounded-full bg-white/15 px-2.5 py-1 hover:bg-white/25">
                    {x.competition.short_name ?? x.competition.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:ml-auto">
            <FavoriteButton kind="team" id={team.id} path={`/clubs/${team.slug}`} />
          </div>
        </div>
      </header>

      {team.description && <p className="mt-8 max-w-prose text-lg">{team.description}</p>}

      <section aria-labelledby="h-indice" className="mt-10 grid gap-5 md:grid-cols-[16rem_16rem_1fr]">
        <h2 id="h-indice" className="sr-only">Indice Ambiance et forme</h2>
        <div className="bg-bordeaux text-white rounded-2xl p-5">
          <p className="text-sm text-white/70">Indice Ambiance</p>
          {rating ? (
            <>
              <p className="groovy text-5xl text-moutarde mt-1">{Math.round(rating.rating)}</p>
              <p className="text-sm mt-1">{rating.rank ? <>{rating.rank}<sup>e</sup> {team.is_national ? "sélection" : "club"} au classement</> : ""}</p>
              {rating.rating_7d != null && (
                <p className={`text-sm mt-1 ${rating.rating - rating.rating_7d >= 0 ? "text-moutarde" : "text-white/70"}`}>
                  {rating.rating - rating.rating_7d >= 0 ? "▲" : "▼"} {Math.abs(Math.round(rating.rating - rating.rating_7d))} sur 7 jours
                </p>
              )}
              <Link href="/indice" className="text-xs underline underline-offset-2 text-white/70 mt-3 inline-block">Voir le classement</Link>
            </>
          ) : <p className="mt-2 text-white/80 text-sm">Calculé dès le premier résultat.</p>}
        </div>
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <p className="text-sm text-sourdine mb-2">Forme du moment</p>
          {form ? <Forme f={form} /> : <p className="text-sm text-sourdine">Pas encore de match joué.</p>}
        </div>
        <div className="bg-surface border border-trait rounded-2xl p-5 min-w-0">
          <p className="text-sm text-sourdine mb-2">Évolution de l&apos;Indice</p>
          {full ? (
            <Courbe points={history} />
          ) : (
            <div className="h-full grid place-items-center text-center text-sm py-6">
              <p>La courbe de l&apos;Indice match après match est réservée aux Supporters.<br />
                <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-prochains">
          <h2 id="h-prochains" className="text-xl font-bold mb-3">Prochains matchs</h2>
          {upcoming.length ? (
            <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
              {upcoming.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
            </ul>
          ) : <p className="text-sourdine">Aucun match programmé.</p>}
        </section>
        <section aria-labelledby="h-derniers">
          <h2 id="h-derniers" className="text-xl font-bold mb-3">Derniers résultats</h2>
          {results.length ? (
            <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
              {results.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
            </ul>
          ) : <p className="text-sourdine">Pas encore de résultat.</p>}
        </section>
      </div>

      {league && standings.length > 0 && (
        <section aria-labelledby="h-class" className="mt-10">
          <h2 id="h-class" className="text-xl font-bold mb-3">Classement du {league.name}</h2>
          <StandingsTable rows={standings} zones={zonesFor(league.slug)} highlight={team.id} />
        </section>
      )}

      <section aria-labelledby="h-effectif" className="mt-10">
        <h2 id="h-effectif" className="text-xl font-bold mb-3">Effectif</h2>
        {squad.length === 0 ? (
          <p className="text-sourdine">L&apos;effectif n&apos;a pas encore été saisi par la rédaction.</p>
        ) : (
          <div className="grid gap-6">
            {[...POSITION_GROUPS, { label: "Poste non renseigné", positions: [""] }].map((g) => {
              const list = squad.filter((p) => g.positions.includes(p.position ?? ""));
              if (!list.length) return null;
              return (
                <div key={g.label}>
                  <h3 className="font-semibold text-sourdine mb-2">{g.label}</h3>
                  <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((p) => (
                      <li key={p.id}>
                        <Link href={`/joueurs/${p.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-2xl p-2.5 hover:border-vin carte-vie">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                          ) : (
                            <span className="w-10 h-10 rounded-full bg-teinte grid place-items-center titre font-bold text-vin">{p.last_name.slice(0, 1)}</span>
                          )}
                          <span className="min-w-0">
                            <span className="block font-semibold truncate">{p.first_name} {p.last_name}</span>
                            <span className="block text-xs text-sourdine">{p.position ? POSITIONS[p.position] : ""}{p.nationality ? `, ${p.nationality}` : ""}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {articles.length > 0 && (
        <section aria-labelledby="h-actus" className="mt-10">
          <h2 id="h-actus" className="text-xl font-bold mb-4">Actus du club</h2>
          <div className="grid gap-5 sm:grid-cols-2">{articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        </section>
      )}
    </div>
  );
}
