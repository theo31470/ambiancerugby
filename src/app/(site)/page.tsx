import Link from "next/link";
import ArticleCard, { ArticleHero } from "@/components/ArticleCard";
import MatchGroups from "@/components/MatchGroups";
import StandingsTable from "@/components/StandingsTable";
import LiveRefresh from "@/components/LiveRefresh";
import TeamBadge from "@/components/TeamBadge";
import Defile from "@/components/deco/Defile";
import TitreSection from "@/components/deco/TitreSection";
import Reveal from "@/components/deco/Reveal";
import Prono from "@/components/algo/Prono";
import Forme from "@/components/algo/Forme";
import { Ballon, Beret, Echarpe, Pinte, Poteaux, Trompette } from "@/components/deco/Icones";
import { getArticles, getCompetition, getMatchesOfDay, getStandings, MATCH_SELECT } from "@/lib/queries";
import { getPowerRanking, getRatings, pronostic } from "@/lib/algo";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { fmtDay, fmtRelative, fmtTime, isLive, parisToday, isoFromNow } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const dynamic = "force-dynamic";

async function nextMatchday(): Promise<{ day: string | null; matches: MatchFull[] }> {
  const today = parisToday();
  const todays = await getMatchesOfDay(today);
  if (todays.length) return { day: today, matches: todays };
  // pas de match aujourd'hui : on affiche la prochaine date avec des matchs
  const { data } = await publicClient().from("matches").select("kickoff_at").gte("kickoff_at", isoFromNow(0)).order("kickoff_at").limit(1);
  if (!data?.length) return { day: null, matches: [] };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(data[0].kickoff_at));
  return { day, matches: await getMatchesOfDay(day) };
}

/** Le match à suivre : un direct en priorité, sinon le prochain grand rendez-vous. */
async function matchAffiche(): Promise<MatchFull | null> {
  const db = publicClient();
  const { data: live } = await db.from("matches").select(MATCH_SELECT).in("status", ["live", "halftime"]).order("kickoff_at").limit(1);
  if (live?.length) return live[0] as unknown as MatchFull;
  const { data } = await db.from("matches").select(MATCH_SELECT).eq("status", "scheduled").gte("kickoff_at", isoFromNow(-3600e3)).order("kickoff_at").limit(12);
  const list = (data ?? []) as unknown as MatchFull[];
  const ordre = ["top-14", "champions-cup", "six-nations", "pro-d2"];
  const prio = (m: MatchFull) => {
    const i = ordre.indexOf(m.competition.slug);
    return i === -1 ? 99 : i;
  };
  // le plus proche dans le temps, puis la compétition la plus suivie
  const premierJour = list[0] ? fmtDay(list[0].kickoff_at, { day: "numeric", month: "numeric" }) : null;
  const memeJour = list.filter((m) => fmtDay(m.kickoff_at, { day: "numeric", month: "numeric" }) === premierJour);
  return memeJour.sort((a, b) => prio(a) - prio(b) || a.kickoff_at.localeCompare(b.kickoff_at))[0] ?? null;
}

async function lastResults() {
  const { data } = await publicClient().from("matches").select(MATCH_SELECT).eq("status", "finished").order("kickoff_at", { ascending: false }).limit(6);
  return (data ?? []) as unknown as MatchFull[];
}

async function derniersCommentaires() {
  const { data } = await publicClient()
    .from("comments")
    .select("id,body,created_at, author:profiles(display_name,plan,plan_until), article:articles(slug,title), match:matches(id)")
    .order("created_at", { ascending: false })
    .limit(4);
  return (data ?? []) as unknown as { id: string; body: string; created_at: string; author: { display_name: string | null; plan: string; plan_until: string | null } | null; article: { slug: string; title: string } | null; match: { id: string } | null }[];
}

const TITRE = ["Le", "rugby,", "côté", "tribune."];

export default async function Home() {
  const [articles, upcoming, results, top14, affiche, power, comments, viewer] = await Promise.all([
    getArticles({ limit: 7 }),
    nextMatchday(),
    lastResults(),
    getCompetition("top-14"),
    matchAffiche(),
    getPowerRanking(false, 6),
    derniersCommentaires(),
    getViewer(),
  ]);
  const standings = top14 ? await getStandings(top14.id, top14.current_season) : [];
  const ratings = affiche ? await getRatings([affiche.home_team_id, affiche.away_team_id]) : new Map();
  const prono = affiche ? pronostic(ratings.get(affiche.home_team_id)?.rating, ratings.get(affiche.away_team_id)?.rating) : null;
  const [hero, ...others] = articles;
  const isToday = upcoming.day === parisToday();

  return (
    <div>
      <LiveRefresh />

      {/* ================= EN-TÊTE ================= */}
      <section className="pleine-largeur relative overflow-hidden bg-bordeaux text-white -mt-6 sm:-mt-10" aria-labelledby="h-une">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
          <g stroke="white" strokeOpacity=".07" strokeWidth="2">
            <line x1="6" y1="0" x2="6" y2="100" vectorEffect="non-scaling-stroke" /><line x1="24" y1="0" x2="24" y2="100" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <line x1="50" y1="0" x2="50" y2="100" vectorEffect="non-scaling-stroke" /><line x1="76" y1="0" x2="76" y2="100" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /><line x1="94" y1="0" x2="94" y2="100" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <Poteaux className="absolute -right-10 -bottom-6 h-[26rem] w-auto text-white/[0.06] [--deco-accent:transparent]" />
        <Pinte className="absolute left-[46%] top-8 h-16 w-auto text-bordeaux opacity-30 -rotate-12 hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-28 sm:pt-16 sm:pb-36 grid gap-10 lg:grid-cols-[1.15fr_1fr] items-center relative">
          <div>
            <h1 id="h-une" className="groovy text-[3.4rem] leading-[0.9] sm:text-7xl lg:text-8xl text-white">
              {TITRE.map((m, i) => (
                <span key={i} className="mot mr-[0.22em]" style={{ ["--i" as string]: i }}>
                  {i === 3 ? <span className="text-moutarde">{m}</span> : m}
                </span>
              ))}
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-md">
              Les scores en direct, notre Indice Ambiance des clubs, les pronos, les stats des joueurs et toute l&apos;actu, du Top 14 au Tournoi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/matchs" className="bouton-or"><Ballon className="tourne w-6" />Les matchs du jour</Link>
              {viewer ? (
                <Link href="/indice" className="bouton-discret !bg-transparent !text-white !border-white/30 hover:!bg-white/10">L&apos;Indice Ambiance</Link>
              ) : (
                <Link href="/inscription" className="bouton-discret !bg-transparent !text-white !border-white/30 hover:!bg-white/10">Rejoindre la tribune</Link>
              )}
            </div>
          </div>

          {/* le match à suivre */}
          <div className="relative z-10">
            <div className="absolute -inset-3 rounded-[2rem] bg-vin rotate-2" aria-hidden />
            <div className="relative rounded-[1.75rem] bg-surface text-encre p-6 sm:p-7 shadow-[0_14px_0_-6px_rgba(0,0,0,.25)]">
              {affiche ? (
                <Link href={`/matchs/${affiche.id}`} className="block group">
                  <p className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-vin">{isLive(affiche.status) ? "En direct" : "Le match à suivre"}</span>
                    <span className="text-sourdine">{affiche.competition.short_name ?? affiche.competition.name}</span>
                  </p>
                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                    <div className="grid justify-items-center gap-2"><TeamBadge team={affiche.home} size="lg" /><span className="titre font-bold leading-tight">{affiche.home.short_name ?? affiche.home.name}</span></div>
                    <div>
                      {isLive(affiche.status) ? (
                        <p className="titre text-4xl font-extrabold tnum text-vin">{affiche.home_score ?? 0}–{affiche.away_score ?? 0}</p>
                      ) : (
                        <>
                          <p className="titre text-3xl font-extrabold tnum">{fmtTime(affiche.kickoff_at)}</p>
                          <p className="text-xs text-sourdine first-letter:uppercase">{fmtDay(affiche.kickoff_at, { weekday: "long", day: "numeric", month: "short" })}</p>
                        </>
                      )}
                    </div>
                    <div className="grid justify-items-center gap-2"><TeamBadge team={affiche.away} size="lg" /><span className="titre font-bold leading-tight">{affiche.away.short_name ?? affiche.away.name}</span></div>
                  </div>
                  {prono && (
                    <div className="mt-6">
                      <Prono p={prono} home={affiche.home.short_name ?? affiche.home.name} away={affiche.away.short_name ?? affiche.away.name} verrou={!viewer?.supporter} />
                    </div>
                  )}
                </Link>
              ) : (
                <div className="text-center py-6">
                  <Echarpe className="w-16 h-auto mx-auto text-vin" />
                  <p className="mt-3 titre font-bold text-lg">Les crampons sont au vestiaire</p>
                  <p className="text-sm text-sourdine mt-1">Le prochain match à suivre s&apos;affichera ici dès que le calendrier sera synchronisé.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* le ballon ovale rebondit où il veut */}
        <div className="ballon-trajet pointer-events-none" aria-hidden>
          <div className="ballon-rebond pb-16 sm:pb-20"><Ballon className="w-14 sm:w-16 text-moutarde [--deco-trait:var(--bordeaux)]" /></div>
        </div>
      </section>
      <Defile ton="or" className="-mt-6 relative z-10" />

      <div className="grid gap-16 mt-16">
        {/* ================= À LA UNE ================= */}
        {hero && (
          <section aria-labelledby="h-alaune">
            <TitreSection id="h-alaune" lien="/actus" lienTexte="Toutes les actus">À la une</TitreSection>
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <Reveal className="apparait"><ArticleHero a={hero} /></Reveal>
              <div className="grid gap-5 content-start">
                {others.slice(0, 4).map((a) => <Reveal key={a.id} className="apparait"><ArticleCard a={a} /></Reveal>)}
              </div>
            </div>
          </section>
        )}

        {/* ================= MATCHS + INDICE ================= */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <section aria-labelledby="h-matchs" className="min-w-0">
            <TitreSection id="h-matchs" lien="/matchs" lienTexte="Tout le calendrier">
              {upcoming.day ? (isToday ? "Matchs du jour" : "Prochains matchs") : "Matchs"}
            </TitreSection>
            {upcoming.day && !isToday && <p className="-mt-2 mb-4 text-sourdine first-letter:uppercase">{fmtDay(`${upcoming.day}T12:00:00Z`)}</p>}
            {upcoming.matches.length ? (
              <MatchGroups matches={upcoming.matches} />
            ) : (
              <Vide icone={<Trompette className="w-16 h-auto text-vin" />} titre="La banda accorde ses instruments" texte="Aucun match programmé pour l'instant. Les calendriers se remplissent dès la synchronisation ou la saisie par la rédaction." />
            )}
            {results.length > 0 && (
              <div className="mt-12">
                <TitreSection>Derniers résultats</TitreSection>
                <MatchGroups matches={results} showDate />
              </div>
            )}
          </section>

          <aside className="grid gap-12 content-start">
            <section aria-labelledby="h-indice">
              <TitreSection id="h-indice" lien="/indice" lienTexte="Le classement">Indice</TitreSection>
              {power.length ? (
                <ol className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
                  {power.map((r, i) => {
                    const delta = r.rating - (r.rating_7d ?? r.rating);
                    return (
                      <li key={r.team_id}>
                        <Link href={`/clubs/${r.team.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-teinte">
                          <span className={`groovy text-xl w-6 ${i < 3 ? "text-vin" : "text-sourdine"}`}>{i + 1}</span>
                          <TeamBadge team={r.team} size="sm" />
                          <span className="font-semibold truncate flex-1">{r.team.short_name ?? r.team.name}</span>
                          {r.form && <Forme f={r.form} compact />}
                          <span className="titre font-bold tnum w-12 text-right">{Math.round(r.rating)}</span>
                          <span className={`text-xs tnum w-8 text-right ${delta > 0 ? "text-ok" : delta < 0 ? "text-alerte" : "text-sourdine"}`}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "="}{Math.abs(Math.round(delta)) || ""}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-sourdine">Notre algorithme classe les clubs dès les premiers résultats.</p>
              )}
            </section>
            {top14 && (
              <section aria-labelledby="h-classement">
                <TitreSection id="h-classement" lien="/competitions/top-14" lienTexte="Complet">Top 14</TitreSection>
                {standings.length ? (
                  <StandingsTable rows={standings} compact zones={{ qualif: 2, barrage: 6, descente: 1 }} />
                ) : (
                  <p className="text-sm text-sourdine">Le classement apparaît après la première synchronisation.</p>
                )}
              </section>
            )}
          </aside>
        </div>

        {/* ================= TROISIÈME MI-TEMPS ================= */}
        <section aria-labelledby="h-3mt" className="pleine-largeur relative overflow-hidden bg-vin text-white py-16">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="bulle" aria-hidden style={{ left: `${(i * 53) % 100}%`, width: `${8 + (i % 4) * 6}px`, height: `${8 + (i % 4) * 6}px`, ["--d" as string]: `${6 + (i % 5)}s`, ["--delai" as string]: `${(i * 0.7) % 6}s` }} />
          ))}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="h-3mt" className="groovy text-4xl sm:text-6xl">Troisième mi-temps</h2>
                <p className="mt-2 text-white/80 max-w-md">Ce que la tribune en pense. Réagissez sous les matchs et les articles.</p>
              </div>
              <Pinte className="w-14 h-auto text-bordeaux rotate-6" />
            </div>
            {comments.length ? (
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {comments.map((c) => {
                  const href = c.article ? `/actus/${c.article.slug}` : c.match ? `/matchs/${c.match.id}` : "#";
                  const supp = c.author?.plan === "supporter" && (!c.author.plan_until || new Date(c.author.plan_until) > new Date());
                  return (
                    <li key={c.id}>
                      <Link href={href} className="carte-vie block rounded-2xl bg-white/10 hover:bg-white/15 p-5 h-full">
                        <p className="line-clamp-3">« {c.body} »</p>
                        <p className="mt-3 text-sm text-white/70">
                          <span className="font-semibold text-white">{c.author?.display_name ?? "Supporter"}</span>
                          {supp && <span className="ml-1.5 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5 align-middle">Supporter</span>}
                          , {fmtRelative(c.created_at)}{c.article ? ` sur « ${c.article.title} »` : ""}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-8 text-white/80">Pas encore de commentaire. Le premier qui parle paie sa tournée.</p>
            )}
          </div>
        </section>

        {/* ================= SUPPORTER ================= */}
        <section aria-labelledby="h-supporter" className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-moutarde -rotate-1" aria-hidden />
          <div className="relative rounded-[2rem] bg-bordeaux text-white p-8 sm:p-12 grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center overflow-hidden">
            <Beret className="absolute -right-6 -top-4 w-40 h-auto text-white/[0.06] rotate-12" />
            <div>
              <h2 id="h-supporter" className="groovy text-4xl sm:text-5xl">Devenez <span className="text-moutarde">Supporter</span></h2>
              <p className="mt-3 text-white/80 max-w-md">Pour 2,99 € par mois, soutenez un média rugby indépendant et passez en tribune d&apos;honneur.</p>
              <Link href="/abonnement" className="bouton-or mt-6"><Ballon className="tourne w-6" />Voir l&apos;abonnement</Link>
            </div>
            <ul className="grid gap-3">
              {[
                ["Stats et algorithme complets", "Pronostics en pourcentages, courbes de l'Indice, notes des joueurs."],
                ["Alertes de match", "Coup d'envoi, essais et score final de vos clubs."],
                ["Contenus exclusifs", "Analyses et articles réservés."],
                ["Badge Supporter", "Visible sur votre profil et vos commentaires."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3 items-start rounded-xl bg-white/5 p-3">
                  <Ballon className="w-7 shrink-0 mt-0.5 text-moutarde [--deco-trait:var(--bordeaux)]" />
                  <span><span className="font-semibold block">{t}</span><span className="text-sm text-white/70">{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function Vide({ icone, titre, texte }: { icone: React.ReactNode; titre: string; texte: string }) {
  return (
    <div className="bg-surface border border-dashed border-trait rounded-2xl p-8 text-center">
      <div className="flex justify-center">{icone}</div>
      <p className="mt-3 titre font-bold text-lg">{titre}</p>
      <p className="mt-1 text-sourdine max-w-md mx-auto">{texte}</p>
    </div>
  );
}
