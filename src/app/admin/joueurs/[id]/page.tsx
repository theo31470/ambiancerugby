import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import PlayerForm from "@/components/admin/PlayerForm";
import Notice from "@/components/admin/Notice";
import { saveParcours } from "../../actions";
import { publicClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";

type Ligne = { kind: "club" | "selection"; equipe: string; periode: string | null; matchs: number | null; points: number | null; source: string };
type Saison = { season: string; competition_id: string; games: number; tries: number; points: number; yellow: number; red: number; games_saisis: number };

export default async function EditJoueur({ params, searchParams }: PageProps<"/admin/joueurs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: player }, { data: teams }, { data: parcours }, { data: saisons }, { data: comps }] = await Promise.all([
    db.from("players").select("*").eq("id", id).maybeSingle(),
    db.from("teams").select("id,name").order("name"),
    db.from("player_career").select("kind,equipe,periode,matchs,points,source").eq("player_id", id).order("kind").order("ordre"),
    db.from("player_season_totals").select("season,competition_id,games,tries,points,yellow,red,games_saisis").eq("player_id", id).order("season", { ascending: false }),
    db.from("competitions").select("id,name"),
  ]);
  if (!player) notFound();
  const p = player as Player & { verrou: boolean; source: string };
  const lignes = (parcours ?? []) as Ligne[];
  const formLignes: (Ligne | null)[] = [...lignes, null, null, null];
  const nomComp = (cid: string) => (comps ?? []).find((c) => c.id === cid)?.name ?? "–";

  return (
    <div>
      <Link href={`/admin/joueurs${p.team_id ? `?club=${p.team_id}` : ""}`} className="text-sm text-sourdine underline underline-offset-4">Tous les joueurs</Link>
      <div className="mt-2">
        <PageHeader titre={`${p.first_name} ${p.last_name}`}
          description={`${p.source === "wikipedia" ? "Créé automatiquement depuis Wikipédia" : "Créé à la main"}${p.verrou ? ", verrouillé : la synchro ne le modifie plus" : ", mis à jour par la synchro chaque semaine"}.`}
          actions={<>
            <Link href={`/joueurs/${p.slug}`} className="bouton-discret">Voir la fiche</Link>
          </>} />
      </div>
      <Notice sp={sp} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Fiche" className="bg-surface border border-trait rounded-2xl p-5">
          <PlayerForm player={p} teams={teams ?? []} back={`/admin/joueurs/${id}`} />
        </section>

        <aside className="grid gap-6 content-start">
          <section aria-labelledby="h-stats" className="bg-surface border border-trait rounded-2xl p-5">
            <h2 id="h-stats" className="font-bold text-lg mb-2">Stats sur le site</h2>
            {(saisons ?? []).length ? (
              <table className="w-full text-sm tnum">
                <thead><tr className="text-xs text-sourdine text-left"><th className="font-semibold pb-1">Saison</th><th className="font-semibold">Compétition</th><th className="font-semibold text-right">MJ</th><th className="font-semibold text-right">E</th><th className="font-semibold text-right">Pts</th></tr></thead>
                <tbody>
                  {((saisons ?? []) as Saison[]).map((x) => (
                    <tr key={x.season + x.competition_id} className="border-t border-trait">
                      <td className="py-1.5">{x.season}</td><td className="truncate max-w-[9rem]">{nomComp(x.competition_id)}</td>
                      <td className="text-right">{x.games}</td><td className="text-right">{x.tries}</td><td className="text-right">{x.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-sourdine">Aucune stat pour l&apos;instant. Elles viennent de la saisie de journée et des stats de départ.</p>}
          </section>
        </aside>
      </div>

      <section id="parcours" aria-labelledby="h-parcours" className="mt-8 bg-surface border border-trait rounded-2xl p-5 scroll-mt-24">
        <h2 id="h-parcours" className="font-bold text-lg">Parcours en carrière</h2>
        <p className="text-sm text-sourdine mt-1">Importé de Wikipédia quand c&apos;est possible. Modifiez, ajoutez ou videz une ligne pour la retirer ; le joueur sera verrouillé pour garder vos corrections.</p>
        <form action={saveParcours} className="mt-4 overflow-x-auto">
          <input type="hidden" name="player_id" value={id} />
          <input type="hidden" name="_back" value={`/admin/joueurs/${id}`} />
          <input type="hidden" name="n" value={formLignes.length} />
          <table className="text-sm tnum">
            <thead><tr className="text-xs text-sourdine text-left">
              <th className="font-semibold pb-1 pr-2">Type</th><th className="font-semibold pr-2">Équipe</th><th className="font-semibold pr-2">Période</th><th className="font-semibold pr-2">Matchs</th><th className="font-semibold">Points</th>
            </tr></thead>
            <tbody>
              {formLignes.map((l, i) => (
                <tr key={i}>
                  <td className="pr-2 py-1">
                    <select name={`${i}.kind`} defaultValue={l?.kind ?? "club"} aria-label={`Type, ligne ${i + 1}`} className="champ !py-1">
                      <option value="club">Club</option><option value="selection">Sélection</option>
                    </select>
                  </td>
                  <td className="pr-2"><input name={`${i}.equipe`} defaultValue={l?.equipe ?? ""} aria-label={`Équipe, ligne ${i + 1}`} className="champ !py-1 w-56" /></td>
                  <td className="pr-2"><input name={`${i}.periode`} defaultValue={l?.periode ?? ""} placeholder="2019–2023" aria-label={`Période, ligne ${i + 1}`} className="champ !py-1 w-28" /></td>
                  <td className="pr-2"><input name={`${i}.matchs`} inputMode="numeric" defaultValue={l?.matchs ?? ""} aria-label={`Matchs, ligne ${i + 1}`} className="champ !py-1 w-20" /></td>
                  <td><input name={`${i}.points`} inputMode="numeric" defaultValue={l?.points ?? ""} aria-label={`Points, ligne ${i + 1}`} className="champ !py-1 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="bouton-discret mt-3">Enregistrer le parcours</button>
        </form>
      </section>
    </div>
  );
}
