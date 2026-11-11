import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { notFound } from "next/navigation";
import Notice from "@/components/admin/Notice";
import { saveStats } from "../../../actions";
import { publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { POSITIONS } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

const COLS: [string, string, string][] = [
  ["minutes", "Min", "Minutes jouées"],
  ["tries", "E", "Essais"],
  ["conversions", "T", "Transformations"],
  ["penalty_goals", "P", "Pénalités réussies"],
  ["drop_goals", "D", "Drops"],
  ["tackles", "Plaq", "Plaquages réussis"],
  ["missed_tackles", "Raté", "Plaquages manqués"],
  ["carries", "Crs", "Courses balle en main"],
  ["metres", "Mèt", "Mètres gagnés"],
  ["line_breaks", "Fr", "Franchissements"],
  ["offloads", "Off", "Passes après contact"],
  ["turnovers_won", "Grat", "Ballons grattés"],
  ["penalties_conceded", "Pén", "Pénalités concédées"],
  ["yellow", "CJ", "Cartons jaunes"],
  ["red", "CR", "Cartons rouges"],
];

export default async function StatsMatch({ params, searchParams }: PageProps<"/studio/matchs/[id]/stats">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = publicClient();
  const { data } = await db.from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const m = data as unknown as MatchFull;
  const [{ data: players }, { data: stats }] = await Promise.all([
    db.from("players").select("id,first_name,last_name,position,number,team_id").in("team_id", [m.home_team_id, m.away_team_id]).eq("in_squad", true).order("number", { nullsFirst: false }).order("last_name"),
    db.from("player_match_stats").select("*").eq("match_id", id),
  ]);
  const byPlayer = new Map((stats ?? []).map((s) => [s.player_id as string, s as Record<string, number | boolean>]));
  const motm = (stats ?? []).find((s) => s.motm)?.player_id ?? "";
  const back = `/studio/matchs/${id}/stats`;

  return (
    <div>
      <Link href={`/studio/matchs/${id}`} className="text-sm text-sourdine underline underline-offset-4">Retour au match</Link>
      <div className="mt-2">
        <PageHeader titre={`Feuille de stats : ${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}`}
          description="Le détail complet (minutes, plaquages, courses…). Cochez les joueurs qui ont joué et remplissez ce que vous avez ; la note sur 10 se calcule à l'enregistrement." />
      </div>
      <div className="mt-6"><Notice sp={sp} /></div>

      <form action={saveStats} className="grid gap-8">
        <input type="hidden" name="match_id" value={id} />
        <input type="hidden" name="_back" value={back} />
        {[m.home, m.away].map((t) => {
          const list = (players ?? []).filter((p) => p.team_id === t.id);
          return (
            <section key={t.id}>
              <h2 className="text-xl font-bold mb-2">{t.name}</h2>
              {list.length === 0 ? (
                <p className="text-sourdine text-sm">Aucun joueur dans l&apos;effectif. <Link href={`/studio/joueurs/nouveau?club=${t.id}`} className="underline">Ajouter des joueurs</Link></p>
              ) : (
                <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
                  <table className="text-sm tnum">
                    <thead>
                      <tr className="text-xs text-sourdine border-b border-trait">
                        <th className="text-left font-semibold px-3 py-2 sticky left-0 bg-surface">Joueur</th>
                        <th className="font-semibold px-1" title="A joué">Joué</th>
                        {COLS.map(([, c, title]) => <th key={c} className="font-semibold px-1" title={title}>{c}</th>)}
                        <th className="font-semibold px-2" title="Homme du match">HdM</th>
                        <th className="font-semibold px-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((p) => {
                        const s = byPlayer.get(p.id);
                        return (
                          <tr key={p.id} className="border-b border-trait last:border-0">
                            <th scope="row" className="text-left font-normal px-3 py-1.5 sticky left-0 bg-surface whitespace-nowrap">
                              <input type="hidden" name="player_id" value={p.id} />
                              <input type="hidden" name={`${p.id}:team`} value={t.id} />
                              <span className="font-semibold">{p.number != null ? `${p.number}. ` : ""}{p.first_name.slice(0, 1)}. {p.last_name}</span>
                              <span className="text-xs text-sourdine block">{p.position ? POSITIONS[p.position] : ""}</span>
                            </th>
                            <td className="px-1 text-center"><input type="checkbox" name={`${p.id}:joue`} defaultChecked={!!s} aria-label={`${p.last_name} a joué`} /></td>
                            {COLS.map(([f, c]) => (
                              <td key={f} className="px-0.5">
                                <input name={`${p.id}:${f}`} inputMode="numeric" defaultValue={s ? String(s[f] ?? "") : f === "minutes" ? "80" : ""} aria-label={`${c} ${p.last_name}`}
                                  className="w-12 rounded border border-trait bg-fond px-1 py-1 text-center" />
                              </td>
                            ))}
                            <td className="px-2 text-center"><input type="radio" name="motm" value={p.id} defaultChecked={motm === p.id} aria-label={`${p.last_name} homme du match`} /></td>
                            <td className="px-2 text-center titre font-bold">{s ? Number(s.rating).toFixed(1) : "–"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
        <div><button className="bouton">Enregistrer la feuille de stats</button></div>
      </form>
    </div>
  );
}
