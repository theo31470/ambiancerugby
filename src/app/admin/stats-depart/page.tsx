import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { importBase, saveBase } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { POSITIONS } from "@/lib/format";

export const metadata = { title: "Stats de départ" };

const COLS: [string, string, string][] = [
  ["games", "MJ", "Matchs joués"],
  ["starts", "Tit", "Titularisations"],
  ["minutes", "Min", "Minutes jouées"],
  ["tries", "E", "Essais"],
  ["conversions", "T", "Transformations"],
  ["penalty_goals", "P", "Pénalités"],
  ["drop_goals", "D", "Drops"],
  ["yellow", "CJ", "Cartons jaunes"],
  ["red", "CR", "Cartons rouges"],
];
const ORDRE = Object.keys(POSITIONS);

export default async function StatsDepart({ searchParams }: PageProps<"/admin/stats-depart">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: comps } = await db.from("competitions").select("id,slug,name,current_season,kind").eq("active", true).neq("kind", "international").order("sort_order");
  const comp = (comps ?? []).find((c) => c.slug === sp.comp) ?? (comps ?? [])[0];
  if (!comp) return <p>Aucune compétition active.</p>;
  const { data: liens } = await db.from("team_competitions").select("team:teams(id,slug,name,squad_count)").eq("competition_id", comp.id).eq("season", comp.current_season);
  const clubs = ((liens ?? []).map((l) => l.team) as unknown as { id: string; slug: string; name: string; squad_count: number | null }[]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const club = clubs.find((c) => c.slug === sp.club) ?? clubs[0];
  const back = `/admin/stats-depart?comp=${comp.slug}${club ? `&club=${club.slug}` : ""}`;

  const [{ data: joueurs }, { data: base }] = club
    ? await Promise.all([
        db.from("players").select("id,first_name,last_name,position").eq("team_id", club.id).eq("in_squad", true),
        db.from("player_season_base").select("*").eq("competition_id", comp.id).eq("season", comp.current_season),
      ])
    : [{ data: [] }, { data: [] }];
  const parJoueur = new Map((base ?? []).map((b) => [b.player_id as string, b as Record<string, number>]));
  const liste = (joueurs ?? []).sort((a, b) => ORDRE.indexOf(a.position ?? "") - ORDRE.indexOf(b.position ?? "") || a.last_name.localeCompare(b.last_name, "fr"));

  return (
    <div>
      <PageHeader titre="Stats de départ"
        description="Les totaux déjà joués avant de saisir les journées sur le site, club par club. Les journées saisies s'ajoutent ensuite automatiquement."
        aide={<>
          <p>Choisissez la compétition et le club, puis remplissez seulement les joueurs qui ont marqué ou pris un carton ; une ligne vide = rien à compter.</p>
          <p>Vous pouvez coller un tableau depuis un tableur : une ligne par joueur, le nom puis les chiffres.</p>
          <p>Astuce : plutôt que des totaux, la « Saisie de journée » avec Claude reconstitue la saison match par match, ce qui donne aussi les notes et le détail.</p>
        </>} />
      <div className="mt-5"><Notice sp={sp} /></div>

      <form method="get" className="flex flex-wrap items-end gap-2 mb-6">
        <label className="grid gap-1 text-sm font-semibold">Compétition
          <select name="comp" defaultValue={comp.slug} className="champ">
            {(comps ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Club
          <select name="club" defaultValue={club?.slug} className="champ">
            {clubs.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <button className="bouton-discret">Afficher</button>
      </form>

      {!club ? <p className="text-sourdine">Aucun club dans cette compétition.</p> : liste.length === 0 ? (
        <p className="text-sourdine">Pas encore de joueurs pour {club.name}. Les effectifs se remplissent automatiquement ; vous pouvez aussi <Link href={`/admin/joueurs/nouveau?club=${club.id}`} className="underline">ajouter un joueur</Link>.</p>
      ) : (
        <>
          <form action={saveBase}>
            <input type="hidden" name="competition_id" value={comp.id} />
            <input type="hidden" name="season" value={comp.current_season} />
            <input type="hidden" name="_back" value={back} />
            <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
              <table className="text-sm tnum">
                <caption className="text-left px-4 pt-3 pb-1 font-bold">{club.name}, {comp.name} {comp.current_season}</caption>
                <thead>
                  <tr className="text-xs text-sourdine border-b border-trait">
                    <th className="text-left font-semibold px-4 py-2 sticky left-0 bg-surface">Joueur</th>
                    {COLS.map(([, c, t]) => <th key={c} className="font-semibold px-1" title={t}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {liste.map((p) => {
                    const b = parJoueur.get(p.id);
                    return (
                      <tr key={p.id} className="border-b border-trait last:border-0">
                        <th scope="row" className="text-left font-normal px-4 py-1 sticky left-0 bg-surface whitespace-nowrap">
                          <input type="hidden" name="player_id" value={p.id} />
                          <span className="font-semibold">{p.last_name}</span> {p.first_name}
                          <span className="block text-xs text-sourdine">{p.position ? POSITIONS[p.position] : "Poste inconnu"}</span>
                        </th>
                        {COLS.map(([f, c]) => (
                          <td key={f} className="px-0.5">
                            <input name={`${p.id}:${f}`} inputMode="numeric" defaultValue={b && b[f] ? String(b[f]) : ""} aria-label={`${c} ${p.last_name}`}
                              className={`${f === "minutes" ? "w-14" : "w-10"} rounded border border-trait bg-fond px-1 py-1 text-center`} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="bouton mt-4">Enregistrer {club.name}</button>
          </form>

          <details className="mt-10 bg-surface border border-trait rounded-2xl p-5">
            <summary className="font-bold cursor-pointer">Coller depuis un tableur</summary>
            <p className="mt-2 text-sm text-sourdine max-w-prose">
              Une ligne par joueur, colonnes dans cet ordre : <strong>Nom, MJ, Tit, Min, E, T, P, D, CJ, CR</strong>, séparées par des tabulations (copier-coller depuis Excel ou Google Sheets) ou des points-virgules.
              Le nom peut être « Prénom Nom » ou « Nom Prénom ». Les colonnes manquantes en fin de ligne valent 0.
            </p>
            <form action={importBase} className="mt-3 grid gap-3">
              <input type="hidden" name="competition_id" value={comp.id} />
              <input type="hidden" name="season" value={comp.current_season} />
              <input type="hidden" name="team_id" value={club.id} />
              <input type="hidden" name="_back" value={back} />
              <label htmlFor="texte" className="sr-only">Données à coller</label>
              <textarea id="texte" name="texte" rows={8} className="champ font-mono text-sm" placeholder={"Antoine Dupont\t7\t7\t520\t3\t0\t0\t0\t1\t0\nThomas Ramos\t8\t8\t610\t1\t18\t14\t0\t0\t0"} />
              <div><button className="bouton-discret">Importer pour {club.name}</button></div>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
