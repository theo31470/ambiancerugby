/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getCompetitions } from "@/lib/queries";
import { publicClient } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/format";
import { Coupe } from "@/components/deco/Icones";
import type { Competition } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compétitions",
  description: "Top 14, Pro D2, Champions Cup, URC, Premiership, Super Rugby, Six Nations, Coupe du monde : classements, calendriers et résultats.",
};
export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const comps = await getCompetitions();
  // matchs en cours et prochain match de chaque compétition
  const { data: prochains } = await publicClient().from("matches").select("competition_id, kickoff_at, status")
    .in("status", ["scheduled", "live", "halftime"]).gte("kickoff_at", isoFromNow(-3 * 3600e3))
    .order("kickoff_at").limit(1000);
  const enDirect = new Set<string>();
  const suivant = new Map<string, string>();
  for (const m of prochains ?? []) {
    if (m.status !== "scheduled") enDirect.add(m.competition_id);
    else if (!suivant.has(m.competition_id)) suivant.set(m.competition_id, m.kickoff_at);
  }
  const clubs = comps.filter((c) => c.kind !== "international");
  const nations = comps.filter((c) => c.kind === "international");

  return (
    <div>
      <section className="pleine-largeur bg-bordeaux text-white -mt-6 sm:-mt-10 relative overflow-hidden">
        <Coupe className="absolute right-6 -bottom-6 h-56 w-auto text-white/[0.07]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14 relative">
          <h1 className="groovy text-5xl sm:text-7xl">Compétitions</h1>
          <p className="mt-3 text-white/80 text-lg max-w-xl">{comps.length} compétitions suivies en direct, des championnats de club aux tests internationaux.</p>
        </div>
      </section>

      <Groupe titre="Compétitions de clubs" comps={clubs} enDirect={enDirect} suivant={suivant} />
      <Groupe titre="Compétitions internationales" comps={nations} enDirect={enDirect} suivant={suivant} />
    </div>
  );
}

function Groupe({ titre, comps, enDirect, suivant }: { titre: string; comps: Competition[]; enDirect: Set<string>; suivant: Map<string, string> }) {
  if (!comps.length) return null;
  return (
    <section aria-labelledby={`g-${titre}`} className="mt-10">
      <h2 id={`g-${titre}`} className="groovy text-3xl text-vin mb-4">{titre}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comps.map((c) => {
          const fond = c.color ?? "var(--vin)";
          const texte = c.text_color ?? "#ffffff";
          const prochain = suivant.get(c.id);
          return (
            <li key={c.id}>
              <Link href={`/competitions/${c.slug}`} className="group relative flex items-center gap-4 rounded-2xl p-4 pr-5 overflow-hidden carte-vie h-full" style={{ background: fond, color: texte }}>
                {/* reflet en biais aux couleurs de la compétition */}
                <span aria-hidden className="absolute -right-10 -top-10 w-36 h-36 rounded-full opacity-15" style={{ background: texte }} />
                <span className="relative w-14 h-14 shrink-0 rounded-xl bg-white grid place-items-center p-1.5 shadow-[0_4px_0_-1px_rgba(0,0,0,.2)]">
                  {c.logo_url ? <img src={c.logo_url} alt="" className="max-w-full max-h-full object-contain" loading="lazy" /> : <Coupe className="h-8 w-auto text-vin" />}
                </span>
                <span className="relative min-w-0">
                  <span className="block titre font-extrabold text-lg leading-tight">{c.name}</span>
                  <span className="block text-sm opacity-80 truncate">{c.region ?? c.country}, {c.current_season}</span>
                  {enDirect.has(c.id) ? (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full bg-white/90 text-alerte px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-alerte animate-pulse" aria-hidden />En direct
                    </span>
                  ) : prochain ? (
                    <span className="mt-1.5 block text-xs opacity-80">
                      Prochain match le {new Date(prochain).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
