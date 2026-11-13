import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import LiveRefresh from "@/components/LiveRefresh";
import FilDuMatch from "@/components/FilDuMatch";
import CourbeAscendant from "@/components/CourbeAscendant";
import CarteTerrain from "@/components/CarteTerrain";
import type { ActionTerrain } from "@/lib/terrain";
import { absolue, filAriane, jsonLd, ORGANISATION, urlMatch } from "@/lib/seo";
import Pronostic from "@/components/pronos/Pronostic";
import AvantMatch from "@/components/AvantMatch";
import Compositions from "@/components/Compositions";
import VoteNote from "@/components/notes/VoteNote";
import { createClient } from "@/lib/supabase/server";
import ChronoLive, { type Periodes } from "@/components/ChronoLive";
import Comments from "@/components/Comments";
import Confrontations from "@/components/stats/Confrontations";
import Prono from "@/components/algo/Prono";
import TribuneLive from "@/components/deco/TribuneLive";
import Forme from "@/components/algo/Forme";
import { getMatch } from "@/lib/queries";
import { getForms, getRatings, pronostic } from "@/lib/algo";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { EVENT_LABEL, STATUS_LABEL, fmtDay, fmtTime, isLive } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/matchs/[id]">): Promise<Metadata> {
  const m = await getMatch((await params).id);
  if (!m) return {};
  const fini = m.status === "finished" && m.home_score != null;
  const enDirect = isLive(m.status);
  const jour = fmtDay(m.kickoff_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const affiche = `${m.home.name} – ${m.away.name}`;
  const title = fini ? `${m.home.name} ${m.home_score}-${m.away_score} ${m.away.name} : résumé, notes et stats (${m.competition.short_name ?? m.competition.name})`
    : enDirect ? `${affiche} en direct : score et fil du match (${m.competition.short_name ?? m.competition.name})`
    : `${affiche} : compositions, pronostic et avant-match (${m.competition.short_name ?? m.competition.name})`;
  const description = fini
    ? `${m.competition.name}, ${jour} : ${m.home.name} ${m.home_score}-${m.away_score} ${m.away.name}. Fil du match, courbe d'ascendant, notes des joueurs et stats complètes.`
    : `${m.competition.name}, ${jour} à ${fmtTime(m.kickoff_at)} : ${affiche}. Pronostic de l'algorithme, compositions, duels poste par poste et score en direct.`;
  const url = urlMatch(m);
  return { title: { absolute: `${title} · Ambiance Rugby` }, description, alternates: { canonical: url }, openGraph: { type: "article", url, title, description } };
}

export default async function MatchPage({ params }: PageProps<"/matchs/[id]">) {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) notFound();
  // une seule adresse par match : l'adresse lisible (les anciens liens par identifiant y sont redirigés)
  const canonique = urlMatch(m);
  if (`/matchs/${decodeURIComponent(id)}` !== canonique) permanentRedirect(canonique);

  const { data: events } = await publicClient()
    .from("match_events")
    .select("id,minute,kind,text,team_id, player:players(slug,first_name,last_name)")
    .eq("match_id", m.id)
    .order("minute", { ascending: true, nullsFirst: true })
    .order("created_at");

  const live = isLive(m.status);
  const { data: amb } = await publicClient().from("match_ambiance").select("team_id,cris").eq("match_id", m.id);
  const totauxTribune = { h: amb?.find((a) => a.team_id === m.home_team_id)?.cris ?? 0, a: amb?.find((a) => a.team_id === m.away_team_id)?.cris ?? 0 };
  const showScore = live || m.status === "finished";
  const linescores = Array.isArray(m.linescores) ? (m.linescores as { home: number; away: number }[]) : null;

  // l'avis de l'algorithme
  const ids = [m.home_team_id, m.away_team_id];
  const [ratings, forms, viewer, { data: hist }, { data: stats }] = await Promise.all([
    getRatings(ids),
    getForms(ids),
    getViewer(),
    publicClient().from("rating_history").select("team_id,delta,rating").eq("match_id", m.id),
    publicClient().from("player_match_stats").select("*, player:players(slug,first_name,last_name,position)").eq("match_id", m.id).order("rating", { ascending: false, nullsFirst: false }),
  ]);
  const prono = m.status === "finished" ? null : pronostic(ratings.get(m.home_team_id)?.rating, ratings.get(m.away_team_id)?.rating);
  const deltaOf = (teamId: string) => (hist ?? []).find((h) => h.team_id === teamId)?.delta as number | undefined;
  const notes = (stats ?? []) as unknown as (Record<string, number | boolean | string> & { player_id: string; team_id: string; rating: number; motm: boolean; player: { slug: string; first_name: string; last_name: string; position: string | null } })[];
  // colonnes du détail : seulement les stats présentes dans ce match (la feuille LNR en donne bien plus qu'ESPN)
  const colonnes = ([
    ["minutes", "Min", "Minutes jouées"], ["tries", "E", "Essais"], ["points", "Pts", "Points"], ["tackles", "Plaq.", "Plaquages réussis"],
    ["line_breaks", "Fr.", "Franchissements"], ["offloads", "PAC", "Passes après contact"], ["turnovers_won", "BG", "Ballons grattés"],
    ["carries", "Courses", "Courses"], ["metres", "Mètres", "Mètres gagnés"], ["cartons", "Cartons", "Cartons"],
  ] as [string, string, string][]).filter(([k]) => k === "cartons" ? notes.some((x) => Number(x.yellow) || Number(x.red)) : notes.some((x) => Number(x[k]) > 0));
  const full = !!viewer?.supporter;
  const { data: terrainRow } = m.status === "finished" || live
    ? await publicClient().from("match_terrain").select("evenements").eq("match_id", m.id).maybeSingle()
    : { data: null };
  const terrain = (terrainRow?.evenements as ActionTerrain[] | undefined) ?? null;
  const [{ data: moyennes }, mesVotes] = await Promise.all([
    publicClient().from("player_votes_moyennes").select("player_id,note,votes").eq("match_id", m.id),
    viewer?.supporter && m.status === "finished"
      ? (await createClient()).from("player_votes").select("player_id,note").eq("match_id", m.id).eq("user_id", viewer.id).then(({ data }) => new Map((data ?? []).map((x) => [x.player_id, x.note as number])))
      : Promise.resolve(new Map<string, number>()),
  ]);
  const noteSup = new Map((moyennes ?? []).map((x) => [x.player_id as string, { note: Number(x.note), votes: Number(x.votes) }]));
  const hommeSup = [...noteSup.entries()].filter(([, v]) => v.votes >= 3).sort((a, b) => b[1].note - a[1].note)[0];
  const monProno = viewer && m.status === "scheduled"
    ? await (await createClient()).from("pronos").select("home_score,away_score").eq("user_id", viewer.id).eq("match_id", m.id).maybeSingle().then(({ data }) => (data ? { h: data.home_score, a: data.away_score } : null))
    : null;
  const hn = m.home.short_name ?? m.home.name;
  const an = m.away.short_name ?? m.away.name;

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([
        {
          "@context": "https://schema.org", "@type": "SportsEvent",
          name: `${m.home.name} – ${m.away.name}`, sport: "Rugby à XV", url: absolue(canonique),
          startDate: m.kickoff_at,
          eventStatus: m.status === "postponed" ? "https://schema.org/EventPostponed" : m.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
          homeTeam: { "@type": "SportsTeam", name: m.home.name, url: absolue(`/clubs/${m.home.slug}`) },
          awayTeam: { "@type": "SportsTeam", name: m.away.name, url: absolue(`/clubs/${m.away.slug}`) },
          competitor: [{ "@type": "SportsTeam", name: m.home.name }, { "@type": "SportsTeam", name: m.away.name }],
          superEvent: { "@type": "SportsEvent", name: m.competition.name, url: absolue(`/competitions/${m.competition.slug}`) },
          organizer: ORGANISATION,
          image: absolue(`${canonique}/opengraph-image`),
          description: `${m.competition.name} : ${m.home.name} – ${m.away.name}${m.status === "finished" && m.home_score != null ? `, score final ${m.home_score}-${m.away_score}` : ""}.`,
        },
        filAriane([["Accueil", "/"], ["Matchs", "/matchs"], [m.competition.name, `/competitions/${m.competition.slug}`], [`${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}`, canonique]]),
      ])} />
      <LiveRefresh matchId={m.id} />
      <p className="text-sm text-sourdine">
        <Link href={`/competitions/${m.competition.slug}`} className="font-semibold text-vin underline underline-offset-4">{m.competition.name}</Link>
        {m.round && <span>, journée {m.round}</span>}
      </p>

      <section aria-label="Score" className="mt-4 bg-bordeaux text-white rounded-xl px-4 py-8 sm:px-10">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamSide team={m.home} align="end" />
          <div className="text-center">
            {showScore ? (
              <p className={`titre tnum font-extrabold text-5xl sm:text-7xl leading-none ${live ? "text-moutarde" : ""}`}>
                {m.home_score ?? 0}<span className="text-white/40 mx-2 sm:mx-3">–</span>{m.away_score ?? 0}
              </p>
            ) : (
              <p className="titre font-extrabold text-4xl sm:text-5xl tnum">{fmtTime(m.kickoff_at)}</p>
            )}
            <p className="mt-3 text-sm font-semibold inline-flex items-center gap-2">
              {live && <span className="pastille" aria-hidden />}
              {live ? <>En direct, <ChronoLive kickoff={m.kickoff_at} clock={m.clock} updatedAt={(m as { updated_at?: string }).updated_at ?? null} status={m.status} periodes={m as Periodes} /></> : STATUS_LABEL[m.status]}
            </p>
          </div>
          <TeamSide team={m.away} align="start" />
        </div>
        {(m.home_tries != null || m.away_tries != null) && (
          <p className="mt-6 text-center text-sm text-white/70 tnum">
            Essais : {m.home_tries ?? 0} – {m.away_tries ?? 0}
          </p>
        )}
      </section>

      <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Info label="Date" value={<span className="first-letter:uppercase inline-block">{fmtDay(m.kickoff_at)}</span>} />
        <Info label="Coup d'envoi" value={fmtTime(m.kickoff_at)} />
        {m.venue && <Info label="Stade" value={m.venue} />}
        {m.tv && <Info label="Diffusion" value={m.tv} />}
      </dl>

      {linescores && linescores.length > 0 && (
        <p className="mt-4 text-sm text-sourdine tnum">Mi-temps : {linescores[0].home} – {linescores[0].away}</p>
      )}

      {(prono || deltaOf(m.home_team_id) != null || forms.size > 0) && (
        <section aria-labelledby="h-algo" className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="bg-surface border border-trait rounded-2xl p-5 sm:p-6">
            <h2 id="h-algo" className="groovy text-2xl text-vin">L&apos;avis de l&apos;algorithme</h2>
            {prono && (
              <div className="mt-4">
                <Prono p={prono} home={hn} away={an} verrou={!full} />
              </div>
            )}
            {m.status === "finished" && deltaOf(m.home_team_id) != null && (
              <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[m.home, m.away].map((t) => {
                  const d = deltaOf(t.id) ?? 0;
                  return (
                    <li key={t.id} className="rounded-xl bg-teinte p-3">
                      <span className="block text-sourdine">{t.short_name ?? t.name}</span>
                      <span className={`titre text-2xl font-extrabold tnum ${d >= 0 ? "text-ok" : "text-alerte"}`}>{d >= 0 ? "+" : "−"}{Math.abs(Math.round(d))}</span>
                      <span className="text-sourdine"> pts d&apos;Indice</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-sourdine">
              Indice Ambiance : {hn} {ratings.get(m.home_team_id) ? Math.round(ratings.get(m.home_team_id)!.rating) : "–"}, {an} {ratings.get(m.away_team_id) ? Math.round(ratings.get(m.away_team_id)!.rating) : "–"}.{" "}
              <Link href="/indice" className="underline underline-offset-2">Comment ça marche</Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[m.home, m.away].map((t) => {
              const f = forms.get(t.id);
              return (
                <div key={t.id} className="bg-surface border border-trait rounded-2xl p-4">
                  <p className="text-sm font-semibold mb-2 truncate">Forme {t.short_name ?? t.name}</p>
                  {f ? <Forme f={f} /> : <p className="text-sm text-sourdine">Pas encore de match.</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section aria-labelledby="h-notes" className="mt-10">
          <h2 id="h-notes" className="groovy text-2xl text-vin mb-3">Les notes du match</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {notes.slice(0, 3).map((s) => (
              <Link key={s.player_id} href={`/joueurs/${s.player.slug}`} className="inline-flex items-center gap-2 rounded-full bg-surface border border-trait pl-1 pr-3 py-1 text-sm font-semibold hover:border-vin">
                <span className="rounded-full bg-moutarde text-bordeaux titre font-extrabold px-2 py-0.5 tnum">{s.rating == null ? "…" : Number(s.rating).toFixed(1)}</span>
                {s.player.first_name.slice(0, 1)}. {s.player.last_name}{s.motm && " ⭐"}
              </Link>
            ))}
          </div>
          {hommeSup && (() => { const j = notes.find((x) => x.player_id === hommeSup[0]); return j ? (
            <p className="mb-3 text-sm">Homme du match des Supporters : <Link href={`/joueurs/${j.player.slug}`} className="font-bold hover:text-vin">{j.player.first_name} {j.player.last_name}</Link> <span className="text-sourdine">({hommeSup[1].note.toFixed(1)}/10, {hommeSup[1].votes} votes)</span></p>
          ) : null; })()}
          <details className="group" open={full && m.status === "finished" ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold text-vin underline underline-offset-4 mb-3">Voir toutes les notes ({notes.length}){full && m.status === "finished" ? " et donner les vôtres" : ""}</summary>
          <div className="bg-surface border border-trait rounded-2xl overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm tnum">
              <thead>
                <tr className="text-xs text-sourdine border-b border-trait">
                  <th scope="col" className="text-left font-semibold py-2.5 pl-4">Joueur</th>
                  <th scope="col" className="font-semibold px-2">Note</th>
                  {m.status === "finished" && <th scope="col" className="font-semibold px-2" title="Moyenne des notes données par les Supporters">Supporters</th>}
                  {full && colonnes.map(([, court, long]) => <th key={court} scope="col" className="font-semibold px-2"><abbr title={long} className="no-underline">{court}</abbr></th>)}
                </tr>
              </thead>
              <tbody>
                {(full ? notes : notes.slice(0, 3)).map((s) => (
                  <tr key={s.player_id} className="border-b border-trait last:border-0">
                    <th scope="row" className="text-left font-normal py-2 pl-4">
                      <Link href={`/joueurs/${s.player.slug}`} className="font-semibold hover:underline underline-offset-4">{s.player.first_name} {s.player.last_name}</Link>
                      <span className="text-sourdine"> {s.team_id === m.home_team_id ? hn : an}</span>
                      {s.motm && <span className="ml-2 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Homme du match</span>}
                    </th>
                    <td className="px-2 text-center">{s.rating == null ? <span className="text-sourdine">…</span> : <span className={`inline-block min-w-10 rounded-full px-2 py-0.5 titre font-extrabold ${s.rating >= 8 ? "bg-moutarde text-bordeaux" : s.rating >= 6.5 ? "bg-teinte" : "bg-alerte/10 text-alerte"}`}>{Number(s.rating).toFixed(1)}</span>}</td>
                    {m.status === "finished" && (
                      <td className="px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span className="titre font-extrabold" title={noteSup.get(s.player_id) ? `${noteSup.get(s.player_id)!.votes} vote(s)` : "Pas encore de vote"}>{noteSup.get(s.player_id)?.note.toFixed(1) ?? "–"}</span>
                          {full && <VoteNote matchId={m.id} playerId={s.player_id} initial={mesVotes.get(s.player_id) ?? null} nom={`${s.player.first_name} ${s.player.last_name}`} />}
                        </span>
                      </td>
                    )}
                    {full && colonnes.map(([cle]) => <td key={cle} className="px-2 text-center">{cle === "cartons" ? `${"🟨".repeat(Number(s.yellow) || 0)}${"🟥".repeat(Number(s.red) || 0)}` || "–" : Number(s[cle]) || "–"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {!full && notes.length > 3 && (
              <p className="p-4 text-sm text-center border-t border-trait">
                Les {notes.length - 3} autres notes et le détail des stats sont réservés aux Supporters.{" "}
                <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link>
              </p>
            )}
          </div>
          </details>
        </section>
      )}

      {m.status === "scheduled" && new Date(m.kickoff_at) > new Date() && (
        <section aria-labelledby="h-prono" className="mt-10 max-w-3xl bg-surface border border-trait rounded-2xl p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex-1 min-w-[12rem]">
            <h2 id="h-prono" className="groovy text-2xl text-vin">Votre prono</h2>
            <p className="text-sm text-sourdine">{m.home.short_name ?? m.home.name} – {m.away.short_name ?? m.away.name}, jusqu&apos;au coup d&apos;envoi. <Link href="/pronos" className="underline underline-offset-4 hover:text-vin">Tous les pronos</Link></p>
          </div>
          <Pronostic matchId={m.id} initial={monProno} ferme={false} connecte={!!viewer} />
        </section>
      )}
      {m.status === "scheduled" && <AvantMatch match={m as never} home={m.home} away={m.away} full={full} />}
      {(live || m.status === "finished") && <Compositions matchId={m.id} lnrUrl={(m as { lnr_url?: string | null }).lnr_url ?? null} lignes={notes as never} home={m.home} away={m.away} live={live} />}
      {events && events.length > 1 && (live || m.status === "finished") && (
        <CourbeAscendant full={full} events={events as never} home={m.home} away={m.away}
          minuteActuelle={m.status === "finished" ? 80 : m.status === "halftime" ? 40 : Math.min(80, Math.max(0, ...events.map((e) => e.minute ?? 0), m.clock && /^\d+/.test(m.clock) ? parseInt(m.clock, 10) : 0))} />
      )}
      {terrain && <CarteTerrain actions={terrain} home={m.home} away={m.away} full={full} />}
      {events && events.length > 0 && <FilDuMatch events={events as never} home={m.home} away={m.away} live={live} clock={m.clock} kickoff={m.kickoff_at} updatedAt={(m as { updated_at?: string }).updated_at ?? null} status={m.status} periodes={m as Periodes} />}

      <Confrontations matchId={m.id} home={m.home} away={m.away} />

      {m.status !== "cancelled" && <TribuneLive matchId={m.id} enDirect={live} home={m.home} away={m.away} totaux={totauxTribune} favori={viewer?.favorite_team_id} />}

      <Comments matchId={m.id} path={`/matchs/${m.id}`} />
    </article>
  );
}

function TeamSide({ team, align }: { team: { slug: string; name: string; short_name: string | null; logo_url: string | null; color: string | null; abbreviation: string | null; id: string }; align: "start" | "end" }) {
  return (
    <Link href={`/clubs/${team.slug}`} className={`flex flex-col items-center sm:flex-row gap-2 sm:gap-4 hover:underline underline-offset-4 ${align === "end" ? "sm:justify-end sm:flex-row-reverse" : ""}`}>
      <TeamBadge team={team} size="lg" />
      <span className="titre font-bold text-base sm:text-2xl text-center sm:text-left leading-tight">{team.name}</span>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sourdine">{label}</dt>
      <dd className="font-semibold mt-0.5">{value}</dd>
    </div>
  );
}
