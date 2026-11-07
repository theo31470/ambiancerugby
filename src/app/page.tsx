import Link from "next/link";
import ArticleCard, { ArticleHero } from "@/components/ArticleCard";
import MatchGroups from "@/components/MatchGroups";
import StandingsTable from "@/components/StandingsTable";
import LiveRefresh from "@/components/LiveRefresh";
import { getArticles, getCompetition, getCompetitions, getMatchesOfDay, getStandings, MATCH_SELECT } from "@/lib/queries";
import { publicClient } from "@/lib/supabase/server";
import { fmtDay, parisToday } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const dynamic = "force-dynamic";

async function nextMatchday(): Promise<{ day: string | null; matches: MatchFull[] }> {
  const today = parisToday();
  const todays = await getMatchesOfDay(today);
  if (todays.length) return { day: today, matches: todays };
  // pas de match aujourd'hui : on affiche la prochaine date avec des matchs
  const { data } = await publicClient().from("matches").select("kickoff_at").gte("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(1);
  if (!data?.length) return { day: null, matches: [] };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(data[0].kickoff_at));
  return { day, matches: await getMatchesOfDay(day) };
}

async function lastResults() {
  const { data } = await publicClient().from("matches").select(MATCH_SELECT).eq("status", "finished").order("kickoff_at", { ascending: false }).limit(8);
  return (data ?? []) as unknown as MatchFull[];
}

export default async function Home() {
  const [articles, upcoming, results, top14, competitions] = await Promise.all([
    getArticles({ limit: 7 }),
    nextMatchday(),
    lastResults(),
    getCompetition("top-14"),
    getCompetitions(),
  ]);
  const standings = top14 ? await getStandings(top14.id, top14.current_season) : [];
  const [hero, ...others] = articles;
  const isToday = upcoming.day === parisToday();

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <LiveRefresh />
      <div className="grid gap-12 min-w-0 content-start">
        {hero ? (
          <section aria-label="À la une" className="grid gap-8">
            <ArticleHero a={hero} />
            {others.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {others.slice(0, 6).map((a) => <ArticleCard key={a.id} a={a} />)}
              </div>
            )}
          </section>
        ) : null}

        <section aria-labelledby="h-matchs">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 id="h-matchs" className="text-2xl font-extrabold">
              {upcoming.day ? (isToday ? "Matchs du jour" : `Prochains matchs, ${fmtDay(`${upcoming.day}T12:00:00Z`)}`) : "Matchs"}
            </h2>
            <Link href="/matchs" className="text-sm font-semibold text-vin underline underline-offset-4 shrink-0">Tout le calendrier</Link>
          </div>
          {upcoming.matches.length ? (
            <MatchGroups matches={upcoming.matches} />
          ) : (
            <p className="bg-surface border border-trait rounded-lg p-5 text-sourdine">
              Aucun match programmé pour l&apos;instant. Les calendriers se remplissent dès la synchronisation des données ou la saisie par la rédaction.
            </p>
          )}
        </section>

        {results.length > 0 && (
          <section aria-labelledby="h-resultats">
            <h2 id="h-resultats" className="text-2xl font-extrabold mb-4">Derniers résultats</h2>
            <MatchGroups matches={results} showDate />
          </section>
        )}
      </div>

      <aside className="grid gap-10 content-start">
        {top14 && (
          <section aria-labelledby="h-classement">
            <div className="flex items-baseline justify-between mb-3">
              <h2 id="h-classement" className="text-xl font-extrabold">Classement du Top 14</h2>
              <Link href="/competitions/top-14" className="text-sm font-semibold text-vin underline underline-offset-4">Complet</Link>
            </div>
            {standings.length ? (
              <StandingsTable rows={standings} compact zones={{ qualif: 2, barrage: 6, descente: 1 }} />
            ) : (
              <p className="text-sm text-sourdine">Le classement apparaît après la première synchronisation.</p>
            )}
          </section>
        )}
        <section aria-labelledby="h-comp">
          <h2 id="h-comp" className="text-xl font-extrabold mb-3">Compétitions</h2>
          <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait">
            {competitions.map((c) => (
              <li key={c.id}>
                <Link href={`/competitions/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-teinte">
                  <span className="w-1.5 h-5 rounded-sm" style={{ background: c.color ?? "var(--vin)" }} aria-hidden />
                  <span className="font-semibold">{c.name}</span>
                  <span className="ml-auto text-xs text-sourdine">{c.country}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
