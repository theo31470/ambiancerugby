import Link from "next/link";
import type { Metadata } from "next";
import { getCompetitions } from "@/lib/queries";

export const metadata: Metadata = { title: "Compétitions" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { league: "Championnats", cup: "Coupes d'Europe", international: "International" };

export default async function CompetitionsPage() {
  const comps = await getCompetitions();
  const groups = ["league", "cup", "international"].map((k) => ({ kind: k, list: comps.filter((c) => c.kind === k) }));
  return (
    <div>
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Compétitions</h1>
      <div className="mt-8 grid gap-10">
        {groups.map((g) => (
          <section key={g.kind} aria-labelledby={`k-${g.kind}`}>
            <h2 id={`k-${g.kind}`} className="text-xl font-bold mb-3">{KIND[g.kind]}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.list.map((c) => (
                <li key={c.id}>
                  <Link href={`/competitions/${c.slug}`} className="flex items-center gap-4 bg-surface border border-trait rounded-2xl p-4 hover:border-vin carte-vie">
                    <span className="w-2 self-stretch rounded-sm" style={{ background: c.color ?? "var(--vin)" }} aria-hidden />
                    <span>
                      <span className="block titre font-bold text-lg leading-tight">{c.name}</span>
                      <span className="block text-sm text-sourdine">{c.country}, saison {c.current_season}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
