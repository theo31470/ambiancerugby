import Link from "next/link";
import type { Metadata } from "next";
import MatchGroups from "@/components/MatchGroups";
import LiveRefresh from "@/components/LiveRefresh";
import { getCompetitions, getMatchesOfDay } from "@/lib/queries";
import { fmtDay, parisToday, shiftDay } from "@/lib/format";

export const metadata: Metadata = { title: "Matchs et scores en direct" };
export const dynamic = "force-dynamic";

export default async function MatchsPage({ searchParams }: PageProps<"/matchs">) {
  const sp = await searchParams;
  const today = parisToday();
  const day = typeof sp.jour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.jour) ? sp.jour : today;
  const compSlug = typeof sp.c === "string" ? sp.c : "";
  const competitions = await getCompetitions();
  const comp = competitions.find((c) => c.slug === compSlug);
  const matches = await getMatchesOfDay(day, comp?.id);

  const days = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 3));
  const href = (d: string, c = compSlug) => `/matchs?jour=${d}${c ? `&c=${c}` : ""}`;

  return (
    <div>
      <LiveRefresh />
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Matchs</h1>

      <nav aria-label="Choisir un jour" className="mt-6 flex items-center gap-1">
        <Link href={href(shiftDay(day, -7))} className="bouton-discret px-2.5" aria-label="Semaine précédente">‹</Link>
        <ol className="defile-scroll flex-1 flex overflow-x-auto gap-1">
          {days.map((d) => {
            const active = d === day;
            return (
              <li key={d} className="flex-1 min-w-[4.5rem]">
                <Link
                  href={href(d)}
                  aria-current={active ? "date" : undefined}
                  className={`block text-center rounded-md px-2 py-2 text-sm leading-tight ${active ? "bg-vin text-white" : "hover:bg-teinte"}`}
                >
                  <span className="block text-xs opacity-80">{d === today ? "Aujourd'hui" : fmtDay(`${d}T12:00:00Z`, { weekday: "short" })}</span>
                  <span className="block font-bold titre text-base">{fmtDay(`${d}T12:00:00Z`, { day: "numeric", month: "short" })}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link href={href(shiftDay(day, 7))} className="bouton-discret px-2.5" aria-label="Semaine suivante">›</Link>
      </nav>

      <nav aria-label="Filtrer par compétition" className="defile-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={href(day, "")} className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold border ${!comp ? "bg-encre text-fond border-encre" : "border-trait hover:bg-teinte"}`}>
          Toutes
        </Link>
        {competitions.map((c) => (
          <Link
            key={c.id}
            href={href(day, c.slug)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold border ${comp?.id === c.id ? "bg-encre text-fond border-encre" : "border-trait hover:bg-teinte"}`}
          >
            {c.short_name ?? c.name}
          </Link>
        ))}
      </nav>

      <h2 className="mt-8 mb-4 text-xl font-bold first-letter:uppercase">{fmtDay(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
      {matches.length ? (
        <MatchGroups matches={matches} />
      ) : (
        <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">
          Pas de match {comp ? `de ${comp.name} ` : ""}ce jour-là. Utilisez les flèches pour changer de semaine.
        </p>
      )}
    </div>
  );
}
