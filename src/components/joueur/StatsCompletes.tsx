import Link from "next/link";
import type { Detail } from "@/lib/stats-detail";

type Ligne = { label: string; total: number; par80?: boolean; format?: (v: number) => string };
type Bloc = { titre: string; lignes: Ligne[]; reperes?: [string, string | null][] };

const virgule = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)} %` : null);

/**
 * Toutes les stats détaillées d'un joueur sur une période (saison ou carrière), rangées par secteur de jeu,
 * en total et ramenées à 80 minutes. Données World Rugby (Opta) ; le Top 14 et la Pro D2 complétés quand World Rugby les a.
 */
export default function StatsCompletes({ d, full, periode }: { d: Detail; full: boolean; periode: string }) {
  const c = d.complet;
  if (c.matchs === 0) return null;
  const blocs: Bloc[] = ([
    {
      titre: "Ballon en main",
      lignes: [
        { label: "Courses", total: c.carries, par80: true }, { label: "Mètres gagnés", total: c.metres, par80: true },
        { label: "Franchissements", total: c.line_breaks, par80: true }, { label: "Défenseurs battus", total: c.defenders_beaten, par80: true },
        { label: "Passes après contact", total: c.offloads, par80: true }, { label: "Passes", total: c.passes, par80: true },
        { label: "Passes décisives", total: c.try_assists, par80: true }, { label: "Essais", total: c.tries, par80: true },
      ],
      reperes: [["Mètres par course", c.carries ? virgule(c.metres / c.carries) : null]],
    },
    {
      titre: "Défense",
      lignes: [
        { label: "Plaquages réussis", total: c.tackles, par80: true }, { label: "Plaquages manqués", total: c.missed_tackles, par80: true },
        { label: "Plaquages dominants", total: c.dominant_tackles, par80: true }, { label: "Ballons grattés", total: c.turnovers_won, par80: true },
      ],
      reperes: [["Réussite au plaquage", pct(c.tackles, c.tackles + c.missed_tackles)]],
    },
    {
      titre: "Jeu au pied",
      lignes: [{ label: "Coups de pied", total: c.kicks, par80: true }, { label: "Mètres au pied", total: c.kick_metres, par80: true }],
      reperes: [["Mètres par coup de pied", c.kicks ? virgule(c.kick_metres / c.kicks) : null]],
    },
    {
      titre: "Conquête",
      lignes: [{ label: "Touches gagnées", total: c.lineouts_won, par80: true }, { label: "Touches volées", total: c.lineouts_stolen, par80: true }, { label: "Rucks gagnés", total: c.rucks_won, par80: true }],
    },
    {
      titre: "Discipline et pertes",
      lignes: [{ label: "Pénalités concédées", total: c.penalties_conceded, par80: true }, { label: "Ballons perdus", total: c.turnovers_conceded, par80: true }, { label: "En-avant et fautes de main", total: c.handling_errors, par80: true }],
    },
  ] as Bloc[]).map((b) => ({ ...b, lignes: b.lignes.filter((l) => l.total > 0) })).filter((b) => b.lignes.length);
  if (!blocs.length) return null;
  const visibles = full ? blocs : blocs.slice(0, 1);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <h3 className="titre font-bold text-lg">Stats détaillées {periode}</h3>
        <p className="text-xs text-sourdine">Sur {c.matchs} match{c.matchs > 1 ? "s" : ""} ({c.minutes} min) à feuille complète · données World Rugby (Opta)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((b) => (
          <div key={b.titre} className="bg-surface border border-trait rounded-2xl p-4">
            <p className="titre font-bold text-vin">{b.titre}</p>
            <table className="mt-2 w-full text-sm tnum">
              <thead className="sr-only"><tr><th scope="col">Stat</th><th scope="col">Total</th><th scope="col">Sur 80 minutes</th></tr></thead>
              <tbody>
                {b.lignes.map((l) => (
                  <tr key={l.label} className="border-t border-trait first:border-0">
                    <th scope="row" className="text-left font-normal py-1.5">{l.label}</th>
                    <td className="text-right font-bold px-2">{l.total}</td>
                    <td className="text-right text-sourdine text-xs w-20">{l.par80 && c.minutes >= 80 ? `${virgule((l.total * 80) / c.minutes)} /80` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {b.reperes?.filter(([, v]) => v).map(([k, v]) => (
              <p key={k} className="mt-2 text-sm"><span className="text-sourdine">{k} :</span> <b className="tnum">{v}</b></p>
            ))}
          </div>
        ))}
        {!full && blocs.length > 1 && (
          <div className="relative bg-surface border border-trait rounded-2xl p-4 overflow-hidden sm:col-span-1 lg:col-span-2">
            <div aria-hidden className="blur-sm select-none pointer-events-none opacity-60 grid gap-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-6 rounded bg-teinte" />)}
            </div>
            <div className="absolute inset-0 grid place-items-center text-center px-4">
              <p className="text-sm font-semibold">Défense, jeu au pied, conquête et discipline : toutes les stats détaillées sont réservées aux Supporters. <Link href="/abonnement" className="text-vin underline underline-offset-4">Devenir Supporter</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
