import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import LiveRefresh from "@/components/LiveRefresh";
import Comments from "@/components/Comments";
import { getMatch } from "@/lib/queries";
import { publicClient } from "@/lib/supabase/server";
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

      {events && events.length > 0 && (
        <section aria-labelledby="h-faits" className="mt-10 max-w-2xl">
          <h2 id="h-faits" className="text-xl font-bold mb-3">Faits de jeu</h2>
          <ol className="border-l-2 border-trait ml-3">
            {events.map((e) => {
              const side = e.team_id === m.home_team_id ? m.home : e.team_id === m.away_team_id ? m.away : null;
              const player = e.player as unknown as { slug: string; first_name: string; last_name: string } | null;
              return (
                <li key={e.id} className="relative pl-6 py-2">
                  <span className={`absolute -left-[7px] top-3.5 w-3 h-3 rounded-full border-2 border-fond ${e.kind === "yellow" ? "bg-moutarde" : e.kind === "red" ? "bg-alerte" : "bg-vin"}`} aria-hidden />
                  <p>
                    <span className="titre font-bold tnum mr-2">{e.minute != null ? `${e.minute}'` : ""}</span>
                    <span className="font-semibold">{EVENT_LABEL[e.kind] ?? e.kind}</span>
                    {side && <span className="text-sourdine">, {side.short_name ?? side.name}</span>}
                  </p>
                  {player && (
                    <Link href={`/joueurs/${player.slug}`} className="text-sm underline underline-offset-2">
                      {player.first_name} {player.last_name}
                    </Link>
                  )}
                  {e.text && <p className="text-sm text-sourdine">{e.text}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

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
