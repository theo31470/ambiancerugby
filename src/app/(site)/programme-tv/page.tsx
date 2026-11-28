import Link from "next/link";
import type { Metadata } from "next";
import MatchGroups from "@/components/MatchGroups";
import { publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { fmtDay } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const metadata: Metadata = {
  title: "Programme TV rugby : sur quelle chaîne voir les matchs",
  description: "Le programme TV du rugby : Top 14, Pro D2 et grands matchs, jour par jour, avec la chaîne et l'heure de chaque rencontre (Canal+, Canal+ Sport 360, France 2…).",
  alternates: { canonical: "/programme-tv" },
};
export const revalidate = 1800;

/** Où regarder : les matchs des 10 prochains jours dont la chaîne est connue, jour par jour. */
export default async function ProgrammeTvPage() {
  const { data } = await publicClient().from("matches").select(MATCH_SELECT)
    .in("status", ["scheduled", "live", "halftime"]).not("tv", "is", null)
    .gte("kickoff_at", new Date(Date.now() - 3 * 3600e3).toISOString())
    .lte("kickoff_at", new Date(Date.now() + 10 * 86400e3).toISOString())
    .order("kickoff_at");
  const matchs = (data ?? []) as unknown as MatchFull[];
  const jours = new Map<string, MatchFull[]>();
  for (const m of matchs) {
    const j = fmtDay(m.kickoff_at, { weekday: "long", day: "numeric", month: "long" });
    jours.set(j, [...(jours.get(j) ?? []), m]);
  }
  return (
    <div className="max-w-3xl">
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Programme TV</h1>
      <p className="mt-3 text-sourdine max-w-prose">Sur quelle chaîne voir les matchs des dix prochains jours. Les chaînes sont celles annoncées par la Ligue ; elles arrivent en général deux à trois semaines avant le match.</p>
      {jours.size ? (
        <div className="mt-8 grid gap-10">
          {[...jours].map(([jour, ms]) => (
            <section key={jour} aria-labelledby={`j-${jour}`}>
              <h2 id={`j-${jour}`} className="titre text-2xl font-extrabold first-letter:uppercase mb-3">{jour}</h2>
              <div className="bg-surface border border-trait rounded-2xl p-3 sm:p-4"><MatchGroups matches={ms} /></div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-8 bg-surface border border-trait rounded-2xl p-6 text-sourdine">Aucune chaîne annoncée pour les dix prochains jours. <Link href="/matchs" className="underline underline-offset-4">Voir tous les matchs</Link>.</p>
      )}
    </div>
  );
}
