/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import MatchRow from "@/components/MatchRow";
import StandingsTable, { zonesFor } from "@/components/StandingsTable";
import ArticleCard from "@/components/ArticleCard";
import FavoriteButton from "@/components/FavoriteButton";
import { getArticles, getSquad, getStandings, getTeam, getTeamCompetitions, getTeamMatches } from "@/lib/queries";
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

  return (
    <div>
      <header className="flex flex-wrap items-center gap-5">
        <TeamBadge team={team} size="xl" />
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-none">{team.name}</h1>
          <p className="mt-2 text-sourdine">
            {[team.city, team.stadium, team.founded ? `fondé en ${team.founded}` : null].filter(Boolean).join(", ")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {comps.filter((x) => x.season === x.competition.current_season).map((x) => (
              <li key={x.competition.id}>
                <Link href={`/competitions/${x.competition.slug}`} className="text-xs font-semibold rounded-full border border-trait px-2.5 py-0.5 hover:bg-teinte">
                  {x.competition.short_name ?? x.competition.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:ml-auto">
          <FavoriteButton kind="team" id={team.id} path={`/clubs/${team.slug}`} />
        </div>
      </header>

      {team.description && <p className="mt-6 max-w-prose text-lg">{team.description}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-prochains">
          <h2 id="h-prochains" className="text-xl font-bold mb-3">Prochains matchs</h2>
          {upcoming.length ? (
            <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait overflow-hidden">
              {upcoming.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
            </ul>
          ) : <p className="text-sourdine">Aucun match programmé.</p>}
        </section>
        <section aria-labelledby="h-derniers">
          <h2 id="h-derniers" className="text-xl font-bold mb-3">Derniers résultats</h2>
          {results.length ? (
            <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait overflow-hidden">
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
                        <Link href={`/joueurs/${p.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-lg p-2.5 hover:border-vin">
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
