import { createClient } from "@/lib/supabase/server";
import { runSync, setCurrentSeason } from "../actions";
import Notice from "@/components/admin/Notice";
import { fmtRelative } from "@/lib/format";
import type { Competition } from "@/lib/types";

export default async function DonneesPage({ searchParams }: PageProps<"/admin/donnees">) {
  const sp = await searchParams;
  const db = await createClient();
  const [{ data: runs }, { data: comps }] = await Promise.all([
    db.from("sync_runs").select("*").order("id", { ascending: false }).limit(25),
    db.from("competitions").select("*").order("sort_order"),
  ]);
  const competitions = (comps ?? []) as Competition[];
  const thisYear = new Date().getFullYear();

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-extrabold">Données</h1>
        <p className="mt-2 text-sourdine max-w-prose">
          Les scores et classements du Top 14, de la Champions Cup, de la Premiership, de l&apos;URC, du Super Rugby, du Rugby Championship et de la Coupe du monde arrivent automatiquement (Oanor) : chaque matin, et toutes les 10 minutes pendant les matchs. Le reste se saisit dans « Matchs et direct ».
        </p>
      </div>
      <Notice sp={sp} />

      <section aria-labelledby="h-auto" className="bg-surface border border-trait rounded-lg p-5">
        <h2 id="h-auto" className="text-xl font-bold">Synchroniser maintenant</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={runSync}>
            <input type="hidden" name="job" value="daily" />
            <input type="hidden" name="_back" value="/admin/donnees" />
            <button className="bouton">Mettre à jour matchs et classements</button>
          </form>
          <form action={runSync}>
            <input type="hidden" name="job" value="teams" />
            <input type="hidden" name="_back" value="/admin/donnees" />
            <button className="bouton-discret">Mettre à jour aussi les équipes</button>
          </form>
        </div>
        <p className="mt-3 text-xs text-sourdine">Une mise à jour complète utilise environ 14 appels, 21 avec les équipes.</p>
      </section>

      <section aria-labelledby="h-histo" className="bg-surface border border-trait rounded-lg p-5">
        <h2 id="h-histo" className="text-xl font-bold">Importer une saison passée (API-Sports)</h2>
        <p className="mt-1 text-sm text-sourdine max-w-prose">
          L&apos;offre gratuite d&apos;API-Sports donne accès aux saisons passées seulement (100 appels par jour). Pratique pour l&apos;historique de la Pro D2, du Tournoi ou de la Challenge Cup. Un import coûte 2 à 3 appels.
        </p>
        <form action={runSync} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="job" value="apisports" />
          <input type="hidden" name="_back" value="/admin/donnees" />
          <div>
            <label htmlFor="competition" className="etiquette">Compétition</label>
            <select id="competition" name="competition" className="champ">
              {competitions.filter((c) => c.apisports_name).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="etiquette">Année de début</label>
            <input id="year" name="year" type="number" min={2005} max={thisYear} defaultValue={thisYear - 3} className="champ w-28" />
          </div>
          <button className="bouton-discret">Importer</button>
        </form>
        <p className="mt-2 text-xs text-sourdine">Exemple : 2023 importe la saison 2023-2024 (ou l&apos;édition 2023 pour le Tournoi).</p>
      </section>

      <section aria-labelledby="h-saisons">
        <h2 id="h-saisons" className="text-xl font-bold mb-3">Saison en cours par compétition</h2>
        <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait">
          {competitions.map((c) => (
            <li key={c.id}>
              <form action={setCurrentSeason} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="_back" value="/admin/donnees" />
                <span className="font-semibold flex-1 min-w-40">{c.name}</span>
                <span className="text-xs text-sourdine">{c.oanor_id ? "automatique" : "saisie rédaction"}</span>
                <label className="sr-only" htmlFor={`s-${c.id}`}>Saison {c.name}</label>
                <input id={`s-${c.id}`} name="season" defaultValue={c.current_season} className="champ w-32" />
                <button className="bouton-discret">Changer</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-journal">
        <h2 id="h-journal" className="text-xl font-bold mb-3">Journal</h2>
        {(runs ?? []).length === 0 ? <p className="text-sourdine">Aucune synchronisation pour l&apos;instant.</p> : (
          <div className="bg-surface border border-trait rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-sourdine text-xs border-b border-trait">
                <th className="px-3 py-2 font-semibold">Quand</th><th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Tâche</th><th className="px-3 py-2 font-semibold">Appels</th><th className="px-3 py-2 font-semibold">Résultat</th>
              </tr></thead>
              <tbody>
                {(runs ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-trait last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtRelative(r.created_at)}</td>
                    <td className="px-3 py-2">{r.provider === "oanor" ? "Oanor" : "API-Sports"}</td>
                    <td className="px-3 py-2">{r.job}</td>
                    <td className="px-3 py-2 tnum">{r.calls}</td>
                    <td className={`px-3 py-2 ${r.ok ? "" : "text-alerte font-semibold"}`}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
