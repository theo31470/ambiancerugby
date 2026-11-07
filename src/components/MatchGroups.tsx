import Link from "next/link";
import MatchRow from "./MatchRow";
import { groupByCompetition } from "@/lib/queries";
import type { MatchFull } from "@/lib/types";

export default function MatchGroups({ matches, showDate = false }: { matches: MatchFull[]; showDate?: boolean }) {
  return (
    <div className="grid gap-6">
      {groupByCompetition(matches).map((g) => (
        <section key={g.competition.id} aria-labelledby={`g-${g.competition.id}`}>
          <h3 id={`g-${g.competition.id}`} className="flex items-center gap-2 text-base font-bold mb-2">
            <span className="w-1.5 h-4 rounded-sm" style={{ background: g.competition.color ?? "var(--vin)" }} aria-hidden />
            <Link href={`/competitions/${g.competition.slug}`} className="hover:underline underline-offset-4">
              {g.competition.name}
            </Link>
          </h3>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {g.matches.map((m) => (
              <li key={m.id}>
                <MatchRow m={m} showDate={showDate} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
