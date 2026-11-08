import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StandingsPools, zonesFor } from "@/components/StandingsTable";
import MatchRow from "@/components/MatchRow";
import TeamBadge from "@/components/TeamBadge";
import ArticleCard from "@/components/ArticleCard";
import LiveRefresh from "@/components/LiveRefresh";
import { getArticles, getCompetition, getCompetitionMatches, getCompetitionTeams, getSeasons, getStandings } from "@/lib/queries";
import { fmtDay } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/competitions/[slug]">): Promise<Metadata> {
  const c = await getCompetition((await params).slug);
  return c ? { title: `${c.name} : classement, calendrier et résultats` } : {};
}

const TABS = [
  { id: "classement", label: "Classement" },
  { id: "calendrier", label: "Calendrier" },
  { id: "resultats", label: "Résultats" },
  { id: "clubs", label: "Équipes" },
];

export default async function CompetitionPage({ params, searchParams }: PageProps<"/competitions/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = await getCompetition(slug);
  if (!c) notFound();

  const seasons = await getSeasons(c.id);
  if (!seasons.includes(c.current_season)) seasons.unshift(c.current_season);
  const season = typeof sp.saison === "string" && seasons.includes(sp.saison) ? sp.saison : c.current_season;
  const tabs = c.standings_mode === "none" ? TABS.filter((t) => t.id !== "classement") : TABS;
  const tab = tabs.find((t) => t.id === sp.vue)?.id ?? tabs[0].id;
  const href = (v: string, s = season) => `/competitions/${c.slug}?vue=${v}${s !== c.current_season ? `&saison=${s}` : ""}`;

  return (
    <div>
      <LiveRefresh />
      <header className="pleine-largeur -mt-6 sm:-mt-10 relative overflow-hidden" style={{ background: c.color ?? "var(--vin)", color: c.text_color ?? "#fff" }}>
        <span aria-hidden className="absolute -right-16 -top-24 w-80 h-80 rounded-full opacity-10" style={{ background: c.text_color ?? "#fff" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-wrap items-center gap-x-6 gap-y-4 relative">
          <span className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-white grid place-items-center p-2 shadow-[0_6px_0_-2px_rgba(0,0,0,.25)]">
            {c.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.logo_url} alt="" className="max-w-full max-h-full object-contain" />
              : <span className="groovy text-3xl text-vin">{(c.short_name ?? c.name).slice(0, 2)}</span>}
          </span>
          <div className="min-w-0">
            <h1 className="groovy text-4xl sm:text-6xl leading-none">{c.name}</h1>
            <p className="mt-2 opacity-80">{c.region ?? c.country}, saison {season}</p>
          </div>
          {seasons.length > 1 && (
            <nav aria-label="Saison" className="flex gap-1 flex-wrap sm:ml-auto">
              {seasons.map((s) => (
                <Link key={s} href={href(tab, s)} aria-current={s === season ? "true" : undefined}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${s === season ? "bg-white text-encre" : "bg-black/10 hover:bg-black/20"}`}>
                  {s}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <nav aria-label="Rubriques" className="defile-scroll mt-6 flex gap-1 border-b border-trait overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.id} href={href(t.id)} aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 px-4 py-2.5 font-semibold border-b-2 -mb-px ${t.id === tab ? "border-vin text-vin" : "border-transparent text-sourdine hover:text-encre"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "classement" && <Classement compId={c.id} season={season} slug={c.slug} calcule={c.standings_source === "calcul"} />}
        {tab === "calendrier" && <Calendrier compId={c.id} season={season} upcoming />}
        {tab === "resultats" && <Calendrier compId={c.id} season={season} upcoming={false} />}
        {tab === "clubs" && <Equipes compId={c.id} season={season} />}
      </div>

      <News compId={c.id} />
    </div>
  );
}

async function Classement({ compId, season, slug, calcule }: { compId: string; season: string; slug: string; calcule: boolean }) {
  const rows = await getStandings(compId, season);
  if (!rows.length) return <Empty>Le classement s&apos;affichera dès les premiers résultats.</Empty>;
  return (
    <div>
      <StandingsPools rows={rows} zones={zonesFor(slug)} />
      {calcule && (
        <p className="mt-3 text-xs text-sourdine max-w-prose">
          Classement calculé par Ambiance Rugby à partir des résultats : 4 points la victoire, 2 le nul, 1 point de bonus défensif. Les bonus offensifs (nombre d&apos;essais) ne sont pas encore comptés.
        </p>
      )}
    </div>
  );
}

async function Calendrier({ compId, season, upcoming }: { compId: string; season: string; upcoming: boolean }) {
  const matches = await getCompetitionMatches(compId, season, { upcoming, limit: upcoming ? 120 : 200 });
  if (!matches.length) return <Empty>{upcoming ? "Aucun match à venir pour cette saison." : "Aucun résultat pour cette saison."}</Empty>;
  // regroupement par journée (champ round) ou par date
  const groups = new Map<string, MatchFull[]>();
  for (const m of matches) {
    const key = m.round ? `Journée ${m.round}` : fmtDay(m.kickoff_at);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return (
    <div className="grid gap-6">
      {[...groups.entries()].map(([label, list]) => (
        <section key={label}>
          <h2 className="font-bold mb-2 first-letter:uppercase">{label}</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {list.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function Equipes({ compId, season }: { compId: string; season: string }) {
  const teams = await getCompetitionTeams(compId, season);
  if (!teams.length) return <Empty>Les équipes apparaîtront après la première synchronisation.</Empty>;
  return (
    <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {teams.map((t) => (
        <li key={t.id}>
          <Link href={`/clubs/${t.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-2xl p-3 hover:border-vin h-full">
            <TeamBadge team={t} size="md" />
            <span className="min-w-0">
              <span className="block font-bold leading-tight">{t.short_name ?? t.name}</span>
              {t.city && <span className="block text-xs text-sourdine truncate">{t.city}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function News({ compId }: { compId: string }) {
  const articles = await getArticles({ competitionId: compId, limit: 4 });
  if (!articles.length) return null;
  return (
    <section aria-labelledby="h-news" className="mt-12">
      <h2 id="h-news" className="text-xl font-bold mb-4">Dernières actus</h2>
      <div className="grid gap-5 sm:grid-cols-2">{articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">{children}</p>;
}
