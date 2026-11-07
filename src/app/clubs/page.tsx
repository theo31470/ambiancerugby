import Link from "next/link";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import { getCompetitions, getCompetitionTeams } from "@/lib/queries";
import { publicClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Clubs et sélections" };
export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const comps = (await getCompetitions()).filter((c) => c.kind === "league" || c.slug === "six-nations");
  const groups = await Promise.all(comps.map(async (c) => ({ c, teams: await getCompetitionTeams(c.id, c.current_season) })));
  const listed = new Set(groups.flatMap((g) => g.teams.map((t) => t.id)));
  const { data: rest } = await publicClient().from("teams").select("*").order("name");
  const others = ((rest ?? []) as Team[]).filter((t) => !listed.has(t.id));

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-extrabold">Clubs et sélections</h1>
      <div className="mt-8 grid gap-10">
        {groups.filter((g) => g.teams.length).map(({ c, teams }) => (
          <section key={c.id} aria-labelledby={`c-${c.id}`}>
            <h2 id={`c-${c.id}`} className="text-xl font-bold mb-3">
              <Link href={`/competitions/${c.slug}`} className="hover:underline underline-offset-4">{c.name}</Link>
            </h2>
            <TeamGrid teams={teams} />
          </section>
        ))}
        {others.length > 0 && (
          <section aria-labelledby="c-autres">
            <h2 id="c-autres" className="text-xl font-bold mb-3">Autres équipes</h2>
            <TeamGrid teams={others} />
          </section>
        )}
      </div>
    </div>
  );
}

function TeamGrid({ teams }: { teams: Team[] }) {
  return (
    <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {teams.map((t) => (
        <li key={t.id}>
          <Link href={`/clubs/${t.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-lg p-3 hover:border-vin h-full">
            <TeamBadge team={t} size="md" />
            <span className="min-w-0">
              <span className="block font-bold leading-tight">{t.short_name ?? t.name}</span>
              {t.city && <span className="block text-xs text-sourdine truncate">{t.city}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
