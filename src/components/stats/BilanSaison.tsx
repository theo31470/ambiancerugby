import { publicClient } from "@/lib/supabase/server";

type Ligne = {
  season: string; played_home: number | null; played_away: number | null; wins_home: number | null; wins_away: number | null;
  draws_home: number | null; draws_away: number | null; losses_home: number | null; losses_away: number | null;
  pf_home: number | null; pf_away: number | null; pa_home: number | null; pa_away: number | null;
  competition: { name: string; short_name: string | null; current_season: string; sort_order: number } | null;
};

const n = (v: number | null) => v ?? 0;
const moy = (pts: number, j: number) => (j ? (pts / j).toFixed(1).replace(".", ",") : "–");

/** Bilan domicile / extérieur de la saison (statistiques d'équipe API-Sports). */
export default async function BilanSaison({ teamId }: { teamId: string }) {
  const { data } = await publicClient().from("team_season_stats")
    .select("season,played_home,played_away,wins_home,wins_away,draws_home,draws_away,losses_home,losses_away,pf_home,pf_away,pa_home,pa_away, competition:competitions(name,short_name,current_season,sort_order)")
    .eq("team_id", teamId);
  const lignes = ((data ?? []) as unknown as Ligne[])
    .filter((l) => l.competition && l.season === l.competition.current_season && n(l.played_home) + n(l.played_away) > 0)
    .sort((a, b) => a.competition!.sort_order - b.competition!.sort_order);
  if (!lignes.length) return null;

  return (
    <section aria-labelledby="h-bilan" className="mt-10">
      <h2 id="h-bilan" className="text-xl font-bold mb-3">Bilan de la saison</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {lignes.map((l) => {
          const cotes = [
            { label: "À domicile", j: n(l.played_home), v: n(l.wins_home), nul: n(l.draws_home), d: n(l.losses_home), pp: n(l.pf_home), pc: n(l.pa_home) },
            { label: "À l'extérieur", j: n(l.played_away), v: n(l.wins_away), nul: n(l.draws_away), d: n(l.losses_away), pp: n(l.pf_away), pc: n(l.pa_away) },
          ];
          return (
            <div key={l.competition!.name} className="bg-surface border border-trait rounded-2xl p-4">
              <p className="titre font-bold">{l.competition!.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {cotes.map((c) => (
                  <div key={c.label}>
                    <p className="text-sm text-sourdine">{c.label}</p>
                    <p className="mt-1 titre text-2xl font-extrabold tnum">
                      {c.v}<span className="text-sourdine text-base font-semibold"> V</span> {c.nul}<span className="text-sourdine text-base font-semibold"> N</span> {c.d}<span className="text-sourdine text-base font-semibold"> D</span>
                    </p>
                    {/* barre victoires / nuls / défaites */}
                    <div className="mt-2 h-2 rounded-full bg-teinte overflow-hidden flex" aria-hidden>
                      {c.j > 0 && <>
                        <span className="bg-ok" style={{ width: `${(c.v / c.j) * 100}%` }} />
                        <span className="bg-sourdine/40" style={{ width: `${(c.nul / c.j) * 100}%` }} />
                        <span className="bg-alerte" style={{ width: `${(c.d / c.j) * 100}%` }} />
                      </>}
                    </div>
                    <p className="mt-2 text-sm tnum">{moy(c.pp, c.j)} pts marqués, {moy(c.pc, c.j)} encaissés <span className="text-sourdine">par match</span></p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
