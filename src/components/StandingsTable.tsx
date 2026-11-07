import Link from "next/link";
import TeamBadge from "./TeamBadge";
import type { StandingRow } from "@/lib/types";

type Zones = { qualif?: number; barrage?: number; descente?: number; total?: number };

/** Zones du championnat (Top 14 / Pro D2) pour colorer la colonne de rang. */
export function zonesFor(slug: string): Zones {
  if (slug === "top-14") return { qualif: 2, barrage: 6, descente: 1 };
  if (slug === "pro-d2") return { qualif: 2, barrage: 6, descente: 2 };
  return {};
}

export default function StandingsTable({ rows, compact = false, zones = {}, highlight }: { rows: StandingRow[]; compact?: boolean; zones?: Zones; highlight?: string }) {
  const n = rows.length;
  const zoneOf = (rank: number) => {
    if (zones.qualif && rank <= zones.qualif) return "bg-vin";
    if (zones.barrage && rank <= zones.barrage) return "bg-moutarde";
    if (zones.descente && rank > n - zones.descente) return "bg-alerte";
    return "bg-transparent";
  };
  return (
    <div className="bg-surface border border-trait rounded-lg overflow-x-auto">
      <table className="w-full text-sm tnum">
        <thead>
          <tr className="text-sourdine text-xs border-b border-trait">
            <th scope="col" className="text-left font-semibold py-2 pl-3 w-8">#</th>
            <th scope="col" className="text-left font-semibold py-2">Club</th>
            <th scope="col" className="font-semibold py-2 px-2" title="Joués">J</th>
            {!compact && (
              <>
                <th scope="col" className="font-semibold py-2 px-2" title="Victoires">V</th>
                <th scope="col" className="font-semibold py-2 px-2" title="Nuls">N</th>
                <th scope="col" className="font-semibold py-2 px-2" title="Défaites">D</th>
                <th scope="col" className="font-semibold py-2 px-2 hidden sm:table-cell" title="Points marqués">PP</th>
                <th scope="col" className="font-semibold py-2 px-2 hidden sm:table-cell" title="Points encaissés">PC</th>
              </>
            )}
            <th scope="col" className="font-semibold py-2 px-2" title="Différence">Diff</th>
            {!compact && <th scope="col" className="font-semibold py-2 px-2" title="Points de bonus">B</th>}
            <th scope="col" className="font-semibold py-2 px-3 text-right" title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.points_for - r.points_against;
            const mine = highlight === r.team.id;
            return (
              <tr key={r.team.id} className={`border-b border-trait last:border-0 ${mine ? "bg-teinte" : ""}`}>
                <td className="py-2 pl-3 relative">
                  <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${zoneOf(r.rank)}`} aria-hidden />
                  <span className="font-semibold">{r.rank}</span>
                </td>
                <th scope="row" className="text-left font-normal py-2 pr-2">
                  <Link href={`/clubs/${r.team.slug}`} className="flex items-center gap-2 hover:underline underline-offset-4 min-w-0">
                    <TeamBadge team={r.team} size="xs" />
                    <span className="truncate font-semibold">{r.team.short_name ?? r.team.name}</span>
                  </Link>
                </th>
                <td className="text-center px-2">{r.played}</td>
                {!compact && (
                  <>
                    <td className="text-center px-2">{r.won}</td>
                    <td className="text-center px-2">{r.drawn}</td>
                    <td className="text-center px-2">{r.lost}</td>
                    <td className="text-center px-2 hidden sm:table-cell">{r.points_for}</td>
                    <td className="text-center px-2 hidden sm:table-cell">{r.points_against}</td>
                  </>
                )}
                <td className="text-center px-2">{diff > 0 ? `+${diff}` : diff}</td>
                {!compact && <td className="text-center px-2">{r.bonus}</td>}
                <td className="text-right px-3 titre font-bold text-base">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!compact && (zones.qualif || zones.barrage) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 text-xs text-sourdine border-t border-trait">
          {zones.qualif && <Legend cls="bg-vin" label="Qualifié pour les demi-finales" />}
          {zones.barrage && <Legend cls="bg-moutarde" label="Barrages" />}
          {zones.descente && <Legend cls="bg-alerte" label="Relégation" />}
        </div>
      )}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} aria-hidden />
      {label}
    </span>
  );
}
