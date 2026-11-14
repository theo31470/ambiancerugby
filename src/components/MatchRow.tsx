import Link from "next/link";
import { urlMatch } from "@/lib/seo";
import TeamBadge from "./TeamBadge";
import { STATUS_LABEL, fmtDay, fmtTime, isLive } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

/** Une rencontre dans une liste : horaire/statut à gauche, équipes et score à droite. */
export default function MatchRow({ m, showDate = false }: { m: MatchFull; showDate?: boolean }) {
  const live = isLive(m.status);
  const done = m.status === "finished";
  const showScore = live || done;
  const winner = done && m.home_score != null && m.away_score != null ? (m.home_score > m.away_score ? "h" : m.away_score > m.home_score ? "a" : null) : null;

  return (
    <Link href={urlMatch(m)} className="flex items-center gap-4 px-3 sm:px-4 py-3 hover:bg-teinte">
      <div className="w-16 sm:w-20 shrink-0 text-sm leading-tight">
        {live ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-vin">
            <span className="pastille" aria-hidden />
            {m.status === "halftime" ? "Mi-temps" : (m.clock ? m.clock.replace(/^(\d+):\d{2}$/, "$1'") : "Direct")}
          </span>
        ) : (
          <>
            {showDate && <span className="block text-xs text-sourdine">{fmtDay(m.kickoff_at, { weekday: "short", day: "numeric", month: "short" })}</span>}
            <span className={done || m.status === "scheduled" ? "font-semibold tnum" : "font-semibold text-alerte"}>
              {m.status === "scheduled" ? fmtTime(m.kickoff_at) : done ? "Terminé" : STATUS_LABEL[m.status]}
            </span>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0 grid gap-1.5">
        {(["h", "a"] as const).map((side) => {
          const t = side === "h" ? m.home : m.away;
          const s = side === "h" ? m.home_score : m.away_score;
          const dim = winner && winner !== side;
          return (
            <div key={side} className="flex items-center gap-2.5">
              <TeamBadge team={t} size="sm" />
              <span className={`truncate ${dim ? "text-sourdine" : "font-semibold"}`}>{t.name}</span>
              {showScore && (
                <span className={`ml-auto titre tnum text-lg font-bold ${dim ? "text-sourdine" : ""} ${live ? "text-vin" : ""}`}>{s ?? "–"}</span>
              )}
            </div>
          );
        })}
      </div>
    </Link>
  );
}
