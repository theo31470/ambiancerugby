import Link from "next/link";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import { getCompetitions, getCompetitionTeams } from "@/lib/queries";
import { publicClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Clubs et sélections", description: "Tous les clubs du Top 14, de la Pro D2, de la Nationale, de Premiership, d'URC, du Super Rugby et les sélections nationales." };
export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const comps = (await getCompetitions()).filter((c) => c.kind === "league");
  const groups = await Promise.all(comps.map(async (c) => ({ c, teams: await getCompetitionTeams(c.id, c.current_season) })));
  const listed = new Set(groups.flatMap((g) => g.teams.map((t) => t.id)));
  const { data: rest } = await publicClient().from("teams").select("*").order("name");
  const autres = ((rest ?? []) as (Team & { categorie?: string })[]).filter((t) => !listed.has(t.id));
  const nations = autres.filter((t) => t.is_national && (t.categorie ?? "senior") === "senior");
  const jeunes = autres.filter((t) => t.is_national && (t.categorie ?? "senior") !== "senior");
  const divers = autres.filter((t) => !t.is_national);

  const sections = [
    ...groups.filter((g) => g.teams.length).map((g) => ({ id: g.c.slug, titre: g.c.name, lien: `/competitions/${g.c.slug}`, teams: g.teams })),
    { id: "selections", titre: "Sélections nationales", lien: null, teams: nations },
    { id: "jeunes", titre: "Moins de 20 ans et équipes A", lien: null, teams: jeunes },
    { id: "autres", titre: "Autres clubs", lien: null, teams: divers },
  ].filter((s) => s.teams.length);

  return (
    <div>
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Clubs et sélections</h1>
      {/* accès rapide aux sections */}
      <nav aria-label="Aller à" className="defile-scroll mt-6 -mx-4 px-4 flex gap-2 overflow-x-auto pb-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full border border-trait bg-surface px-3.5 py-1.5 text-sm font-semibold hover:border-vin">
            {s.titre} <span className="text-sourdine font-normal">{s.teams.length}</span>
          </a>
        ))}
      </nav>
      <div className="mt-6 grid gap-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`t-${s.id}`} className="scroll-mt-24">
            <h2 id={`t-${s.id}`} className="text-xl font-bold mb-3">
              {s.lien ? <Link href={s.lien} className="hover:underline underline-offset-4">{s.titre}</Link> : s.titre}
            </h2>
            <TeamGrid teams={s.teams} />
          </section>
        ))}
      </div>
    </div>
  );
}

function TeamGrid({ teams }: { teams: Team[] }) {
  return (
    <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {teams.map((t) => (
        <li key={t.id}>
          <Link href={`/clubs/${t.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-2xl p-3 hover:border-vin h-full carte-vie">
            <TeamBadge team={t} size="md" />
            <span className="min-w-0">
              <span className="block font-bold leading-tight">{t.short_name ?? t.name}</span>
              {(t.city || t.country) && <span className="block text-xs text-sourdine truncate">{t.city ?? t.country}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
