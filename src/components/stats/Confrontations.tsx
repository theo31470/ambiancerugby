import { publicClient } from "@/lib/supabase/server";
import { fmtDay } from "@/lib/format";
import type { TeamLite } from "@/lib/types";

type Jeu = { date: string; league: string | null; home: string; away: string; home_id: number; away_id: number; hs: number | null; as: number | null };

/** Les dernières confrontations directes (API-Sports), du point de vue de l'équipe qui reçoit. */
export default async function Confrontations({ matchId, home, away }: { matchId: string; home: TeamLite & { apisports_id?: number | null }; away: TeamLite & { apisports_id?: number | null } }) {
  const db = publicClient();
  const [{ data }, { data: ids }] = await Promise.all([
    db.from("match_h2h").select("games").eq("match_id", matchId).maybeSingle(),
    db.from("teams").select("id, apisports_id").in("id", [home.id, away.id]),
  ]);
  const jeux = ((data?.games ?? []) as Jeu[]).filter((g) => g.hs != null && g.as != null);
  if (!jeux.length) return null;
  const apiHome = ids?.find((t) => t.id === home.id)?.apisports_id;
  let vh = 0, va = 0, nuls = 0;
  for (const g of jeux) {
    const scoreHome = g.home_id === apiHome ? g.hs! : g.as!;
    const scoreAway = g.home_id === apiHome ? g.as! : g.hs!;
    if (scoreHome > scoreAway) vh++; else if (scoreHome < scoreAway) va++; else nuls++;
  }
  const total = jeux.length;
  return (
    <section aria-labelledby="h-h2h" className="mt-10">
      <h2 id="h-h2h" className="text-xl font-bold mb-3">Face-à-face</h2>
      <div className="bg-surface border border-trait rounded-2xl p-5">
        <div className="flex items-end justify-between gap-4">
          <p className="text-center"><span className="groovy text-4xl text-vin block">{vh}</span><span className="text-sm text-sourdine">{home.short_name ?? home.name}</span></p>
          <p className="text-center"><span className="groovy text-2xl text-sourdine block">{nuls}</span><span className="text-sm text-sourdine">nul{nuls > 1 ? "s" : ""}</span></p>
          <p className="text-center"><span className="groovy text-4xl text-vin block">{va}</span><span className="text-sm text-sourdine">{away.short_name ?? away.name}</span></p>
        </div>
        <div className="mt-3 h-2.5 rounded-full overflow-hidden flex bg-teinte" aria-hidden>
          <span className="bg-vin" style={{ width: `${(vh / total) * 100}%` }} />
          <span className="bg-sourdine/40" style={{ width: `${(nuls / total) * 100}%` }} />
          <span className="bg-moutarde" style={{ width: `${(va / total) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-sourdine">Sur les {total} dernières confrontations, toutes compétitions.</p>
        <ul className="mt-4 divide-y divide-trait text-sm">
          {jeux.map((g) => (
            <li key={g.date + g.home} className="py-2 flex items-center gap-3">
              <span className="text-sourdine w-24 shrink-0 tnum">{fmtDay(g.date, { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="flex-1 min-w-0 truncate">{g.home} <span className="titre font-bold tnum">{g.hs}–{g.as}</span> {g.away}</span>
              {g.league && <span className="hidden sm:block text-xs text-sourdine truncate max-w-[12rem]">{g.league}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
