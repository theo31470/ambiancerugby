"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { fmtDay, fmtTime, isLive } from "@/lib/format";
import type { Match, MatchFull } from "@/lib/types";

/** Tableau d'affichage : bandeau des scores en direct, présent sur toutes les pages. */
export default function Scoreboard({ initial }: { initial: MatchFull[] }) {
  const [matches, setMatches] = useState(initial);
  const [flash, setFlash] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel("tableau")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload: { new: unknown }) => {
        const m = payload.new as Match;
        setMatches((list) => list.map((x) => {
          if (x.id !== m.id) return x;
          // le score a bougé : on fait clignoter la case
          if (x.home_score !== m.home_score || x.away_score !== m.away_score) setFlash((f) => ({ ...f, [m.id]: Date.now() }));
          return { ...x, ...m, home: x.home, away: x.away, competition: x.competition };
        }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const liveCount = matches.filter((m) => isLive(m.status)).length;

  return (
    <div className="bg-bordeaux text-white">
      <div className="max-w-6xl mx-auto flex items-stretch">
        <Link
          href="/matchs"
          className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-semibold border-r border-white/10 hover:bg-white/5"
        >
          {liveCount > 0 ? (
            <>
              <span className="pastille" aria-hidden />
              <span>{liveCount} en direct</span>
            </>
          ) : (
            <span>Scores</span>
          )}
        </Link>
        {matches.length === 0 ? (
          <p className="px-4 py-2 text-sm text-white/70 self-center">Aucun match ces jours-ci. Le calendrier complet est dans Matchs.</p>
        ) : (
          <ul className="defile-scroll flex overflow-x-auto" aria-label="Scores">
            {matches.map((m) => (
              <li key={`${m.id}-${flash[m.id] ?? 0}`} className={`shrink-0 border-r border-white/10 ${flash[m.id] ? "flash" : ""}`}>
                <Chip m={m} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({ m }: { m: MatchFull }) {
  const live = isLive(m.status);
  const done = m.status === "finished";
  const showScore = live || done;
  const abbr = (t: MatchFull["home"]) => t.abbreviation ?? (t.short_name ?? t.name).slice(0, 3).toUpperCase();
  const winner = done && m.home_score != null && m.away_score != null ? (m.home_score > m.away_score ? "h" : m.away_score > m.home_score ? "a" : null) : null;
  return (
    <Link href={`/matchs/${m.id}`} className="block px-3 py-1.5 hover:bg-white/5 min-w-[9.5rem]">
      <div className="flex items-center justify-between gap-3 text-[11px] text-white/60">
        <span className="truncate">{m.competition.short_name ?? m.competition.name}</span>
        <span className={live ? "text-moutarde font-semibold" : ""}>
          {live ? (m.status === "halftime" ? "MT" : m.clock ?? "Direct") : done ? "Fin" : sameDay(m.kickoff_at) ? fmtTime(m.kickoff_at) : fmtDay(m.kickoff_at, { weekday: "short", day: "numeric" })}
        </span>
      </div>
      {(["h", "a"] as const).map((side) => {
        const t = side === "h" ? m.home : m.away;
        const s = side === "h" ? m.home_score : m.away_score;
        return (
          <div key={side} className="flex items-center justify-between gap-3 leading-tight">
            <span className={`text-sm ${winner && winner !== side ? "text-white/60" : "font-semibold"}`}>{abbr(t)}</span>
            {showScore && <span className={`titre tnum text-sm font-bold ${live ? "text-moutarde" : ""}`}>{s ?? "–"}</span>}
          </div>
        );
      })}
    </Link>
  );
}

function sameDay(iso: string) {
  return fmtDay(iso, { day: "numeric", month: "numeric" }) === fmtDay(new Date(), { day: "numeric", month: "numeric" });
}
