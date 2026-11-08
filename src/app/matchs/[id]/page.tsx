import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import LiveRefresh from "@/components/LiveRefresh";
import FilDuMatch from "@/components/FilDuMatch";
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
  const score = m.home_score != null ? ` ${m.home_score}-${m.away_score}` : "";
  return { title: `${m.home.name}${score} ${m.away.name}`, description: `${m.competition.name}, ${fmtDay(m.kickoff_at)}` };
}

export default async function MatchPage({ params }: PageProps<"/matchs/[id]">) {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) notFound();

  const { data: events } = await publicClient()
    .from("match_events")
    .select("id,minute,kind,text,team_id, player:players(slug,first_name,last_name)")
    .eq("match_id", m.id)
    .order("minute", { ascending: true, nullsFirst: true })
    .order("created_at");

  const live = isLive(m.status);
  const showScore = live || m.status === "finished";
  const linescores = Array.isArray(m.linescores) ? (m.linescores as { home: number; away: number }[]) : null;

  // l'avis de l'algorithme
  const ids = [m.home_team_id, m.away_team_id];
  const [ratings, forms, viewer, { data: hist }, { data: stats }] = await Promise.all([
    getRatings(ids),
    getForms(ids),
    getViewer(),
    publicClient().from("rating_history").select("team_id,delta,rating").eq("match_id", m.id),
    publicClient().from("player_match_stats").select("*, player:players(slug,first_name,last_name,position)").eq("match_id", m.id).order("rating", { ascending: false }),
  ]);
  const prono = m.status === "finished" ? null : pronostic(ratings.get(m.home_team_id)?.rating, ratings.get(m.away_team_id)?.rating);
  const deltaOf = (teamId: string) => (hist ?? []).find((h) => h.team_id === teamId)?.delta as number | undefined;
  const notes = (stats ?? []) as unknown as (Record<string, number | boolean | string> & { player_id: string; team_id: string; rating: number; motm: boolean; player: { slug: string; first_name: string; last_name: string; position: string | null } })[];
  const full = !!viewer?.supporter;
  const hn = m.home.short_name ?? m.home.name;
  const an = m.away.short_name ?? m.away.name;

  return (
    <article>
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
              {live ? (m.status === "halftime" ? "Mi-temps" : `En direct${m.clock ? `, ${m.clock}` : ""}`) : STATUS_LABEL[m.status]}
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
          <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
            <table className="w-full text-sm tnum">
              <thead>
                <tr className="text-xs text-sourdine border-b border-trait">
                  <th scope="col" className="text-left font-semibold py-2.5 pl-4">Joueur</th>
                  <th scope="col" className="font-semibold px-2">Note</th>
                  {full && <><th scope="col" className="font-semibold px-2" title="Essais">E</th><th scope="col" className="font-semibold px-2" title="Points">Pts</th><th scope="col" className="font-semibold px-2" title="Plaquages">Plaq.</th><th scope="col" className="font-semibold px-2" title="Courses">Courses</th><th scope="col" className="font-semibold px-2" title="Mètres gagnés">Mètres</th><th scope="col" className="font-semibold px-2" title="Ballons grattés">Grattés</th></>}
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
                    <td className="px-2 text-center"><span className={`inline-block min-w-10 rounded-full px-2 py-0.5 titre font-extrabold ${s.rating >= 8 ? "bg-moutarde text-bordeaux" : s.rating >= 6.5 ? "bg-teinte" : "bg-alerte/10 text-alerte"}`}>{Number(s.rating).toFixed(1)}</span></td>
                    {full && <><td className="px-2 text-center">{s.tries as number}</td><td className="px-2 text-center">{s.points as number}</td><td className="px-2 text-center">{s.tackles as number}</td><td className="px-2 text-center">{s.carries as number}</td><td className="px-2 text-center">{s.metres as number}</td><td className="px-2 text-center">{s.turnovers_won as number}</td></>}
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
        </section>
      )}

      {events && events.length > 0 && <FilDuMatch events={events as never} home={m.home} away={m.away} live={live} clock={m.clock} />}

      <Confrontations matchId={m.id} home={m.home} away={m.away} />

      {m.status !== "cancelled" && <TribuneLive matchId={m.id} enDirect={live} />}

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
