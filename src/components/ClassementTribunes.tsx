import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import { publicClient } from "@/lib/supabase/server";
import { TEAM_LITE } from "@/lib/queries";
import type { TeamLite } from "@/lib/types";

/** Les tribunes qui ont fait le plus de bruit ces derniers jours (cris envoyés depuis les fiches des matchs). */
export default async function ClassementTribunes({ jours = 4, limite = 8 }: { jours?: number; limite?: number }) {
  const depuis = new Date(Date.now() - jours * 86400_000).toISOString();
  const { data } = await publicClient()
    .from("match_ambiance")
    .select(`cris, supporters, match_id, team:teams(${TEAM_LITE})`)
    .gte("updated_at", depuis)
    .order("cris", { ascending: false })
    .limit(60);
  const parClub = new Map<string, { team: TeamLite; cris: number; supporters: number; match: string }>();
  for (const r of (data ?? []) as unknown as { cris: number; supporters: number; match_id: string; team: TeamLite }[]) {
    const p = parClub.get(r.team.id);
    if (p) { p.cris += r.cris; p.supporters += r.supporters; } else parClub.set(r.team.id, { team: r.team, cris: r.cris, supporters: r.supporters, match: r.match_id });
  }
  const top = [...parClub.values()].sort((a, b) => b.cris - a.cris).slice(0, limite);
  if (!top.length) return null;
  const max = top[0].cris;

  return (
    <section aria-labelledby="h-tribunes" className="mt-12">
      <div className="relative">
        <div aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-3xl bg-moutarde" />
        <div className="relative rounded-3xl bg-bordeaux text-white p-5 sm:p-7">
          <h2 id="h-tribunes" className="groovy text-3xl">Les tribunes qui chantent le plus</h2>
          <p className="mt-1 text-sm text-white/70">Les cris envoyés par les supporters pendant les matchs, ces {jours} derniers jours.</p>
          <ol className="mt-5 grid gap-2.5">
            {top.map((t, i) => (
              <li key={t.team.id}>
                <Link href={`/matchs/${t.match}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  <span className={`w-7 text-center titre font-extrabold tnum ${i === 0 ? "text-moutarde text-xl" : "text-white/60"}`}>{i + 1}</span>
                  <TeamBadge team={t.team} size="sm" />
                  <span className="w-32 sm:w-44 truncate font-semibold">{t.team.short_name ?? t.team.name}</span>
                  <span className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (t.cris / max) * 100)}%`, background: i === 0 ? "var(--moutarde)" : "#f6e4e8" }} />
                  </span>
                  <span className="w-24 text-right text-sm tnum"><b>{t.cris.toLocaleString("fr-FR")}</b> <span className="text-white/60">cris</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
