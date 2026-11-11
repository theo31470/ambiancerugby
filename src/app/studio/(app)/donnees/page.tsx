import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import { runEffectifs, runSync, setWikiTitle, toggleCompetition } from "../actions";
import Notice from "@/components/admin/Notice";
import { fmtRelative } from "@/lib/format";
import type { Competition } from "@/lib/types";

const QUOTA = 7500;
const SOURCES: Record<string, string> = { apisports: "API-Sports", wikipedia: "Wikipédia", thesportsdb: "TheSportsDB", oanor: "Oanor" };

export default async function DonneesPage({ searchParams }: PageProps<"/studio/donnees">) {
  const sp = await searchParams;
  const db = await createClient();
  const minuit = new Date(); minuit.setUTCHours(0, 0, 0, 0);
  const [{ data: runs }, { data: comps }, { data: appels }, { count: nbJoueurs }, { count: nbPhotos }, { count: aCompleter }, { data: clubs }] = await Promise.all([
    db.from("sync_runs").select("*").order("id", { ascending: false }).limit(30),
    db.from("competitions").select("*").order("sort_order"),
    db.from("sync_runs").select("calls").eq("provider", "apisports").gte("created_at", minuit.toISOString()),
    db.from("players").select("id", { count: "exact", head: true }).eq("in_squad", true),
    db.from("players").select("id", { count: "exact", head: true }).eq("in_squad", true).not("photo_url", "is", null),
    db.from("players").select("id", { count: "exact", head: true }).eq("in_squad", true).is("tsdb_checked_at", null),
    db.from("teams").select("id,slug,name,wiki_title,squad_count,squad_synced_at").eq("is_national", false).not("squad_synced_at", "is", null).order("name"),
  ]);
  const competitions = (comps ?? []) as Competition[];
  const utilises = (appels ?? []).reduce((s, r) => s + (r.calls ?? 0), 0);
  const sansEffectif = (clubs ?? []).filter((c) => !c.squad_count || c.squad_count < 12);
  const avecEffectif = (clubs ?? []).length - sansEffectif.length;

  return (
    <div className="grid gap-10">
      <PageHeader titre="Données et synchros"
        description="Tout ce qui arrive tout seul : matchs, scores et classements (API-Sports), effectifs et parcours (Wikipédia), photos (TheSportsDB)."
        aide={<>
          <p>Matchs et classements : chaque nuit, toutes les 2 minutes pendant les matchs, et un rattrapage toutes les 3 heures.</p>
          <p>Effectifs : relus chaque lundi. Photos, dates de naissance et parcours : complétés en continu, par petits lots.</p>
          <p>Vous n&apos;avez normalement rien à faire ici. Les boutons servent à forcer une mise à jour.</p>
        </>} />
      <Notice sp={sp} />

      <section aria-labelledby="h-api" className="bg-surface border border-trait rounded-2xl p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="h-api" className="text-xl font-bold">API-Sports</h2>
          <span className="text-sm text-sourdine">{utilises} appels aujourd&apos;hui sur {QUOTA.toLocaleString("fr-FR")}</span>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-teinte overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={QUOTA} aria-valuenow={utilises} aria-label="Quota du jour">
          <div className={`h-full rounded-full ${utilises / QUOTA > 0.8 ? "bg-alerte" : "bg-vin"}`} style={{ width: `${Math.min(100, (utilises / QUOTA) * 100)}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            ["daily", "Tout mettre à jour", "bouton", "≈ 60 à 100 appels"],
            ["stats", "Stats des équipes", "bouton-discret", "par lots, ≈ 300 appels au total"],
            ["history", "Saison précédente", "bouton-discret", "≈ 35 appels, une seule fois"],
          ].map(([job, label, cls, aide]) => (
            <form key={job} action={runSync}>
              <input type="hidden" name="job" value={job} />
              <input type="hidden" name="_back" value="/studio/donnees" />
              <button className={cls} title={aide}>{label}</button>
            </form>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-comps">
        <h2 id="h-comps" className="text-xl font-bold mb-3">Compétitions</h2>
        <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-sourdine text-xs border-b border-trait">
              <th className="px-4 py-2 font-semibold">Compétition</th><th className="px-3 py-2 font-semibold">Saison</th>
              <th className="px-3 py-2 font-semibold">Classement</th><th className="px-3 py-2 font-semibold">Dernière synchro</th><th className="px-3 py-2 font-semibold"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {competitions.map((c) => (
                <tr key={c.id} className={`border-b border-trait last:border-0 ${c.active ? "" : "opacity-55"}`}>
                  <th scope="row" className="text-left px-4 py-2">
                    <span className="inline-flex items-center gap-2 font-semibold"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color ?? "var(--vin)" }} aria-hidden />{c.name}</span>
                  </th>
                  <td className="px-3 py-2 tnum">{c.current_season}</td>
                  <td className="px-3 py-2 text-sourdine">{c.standings_mode === "none" ? "sans" : c.standings_source === "api" ? "officiel" : c.standings_source === "calcul" ? "calculé" : "–"}</td>
                  <td className="px-3 py-2 text-sourdine whitespace-nowrap">{c.last_synced_at ? fmtRelative(c.last_synced_at) : "jamais"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 justify-end">
                      {c.active && c.apisports_id && (
                        <form action={runSync}>
                          <input type="hidden" name="job" value="competition" /><input type="hidden" name="slug" value={c.slug} /><input type="hidden" name="_back" value="/studio/donnees" />
                          <button className="bouton-discret !py-1 !px-3 text-xs">Synchroniser</button>
                        </form>
                      )}
                      <form action={toggleCompetition}>
                        <input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.active ? "0" : "1"} /><input type="hidden" name="_back" value="/studio/donnees" />
                        <button className="bouton-discret !py-1 !px-3 text-xs">{c.active ? "Masquer" : "Activer"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-sourdine">« Calculé » : classement recalculé par Ambiance Rugby à partir des résultats (l&apos;API n&apos;en fournit pas ou il est en retard). Les bonus offensifs n&apos;y figurent pas.</p>
      </section>

      <section id="effectifs" aria-labelledby="h-eff" className="bg-surface border border-trait rounded-2xl p-5 scroll-mt-24">
        <h2 id="h-eff" className="text-xl font-bold">Effectifs</h2>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[["Joueurs", nbJoueurs ?? 0], ["Avec photo", nbPhotos ?? 0], ["Clubs remplis", avecEffectif], ["Photos à chercher", aCompleter ?? 0]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-teinte p-3"><dt className="text-xs text-sourdine">{k}</dt><dd className="titre text-2xl font-extrabold tnum">{v}</dd></div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={runEffectifs}>
            <input type="hidden" name="job" value="squads" /><input type="hidden" name="force" value="on" /><input type="hidden" name="_back" value="/studio/donnees" />
            <button className="bouton">Relire tous les effectifs</button>
          </form>
          <form action={runEffectifs}>
            <input type="hidden" name="job" value="enrich" /><input type="hidden" name="_back" value="/studio/donnees" />
            <button className="bouton-discret">Chercher des photos maintenant</button>
          </form>
        </div>
        <p className="mt-2 text-xs text-sourdine">Une relecture complète prend plusieurs passages de 2 minutes. Les joueurs que vous modifiez à la main sont verrouillés et ne sont plus touchés par la synchro.</p>

        {sansEffectif.length > 0 && (
          <details className="mt-5">
            <summary className="font-semibold cursor-pointer">{sansEffectif.length} clubs sans effectif trouvé sur Wikipédia</summary>
            <p className="mt-2 text-sm text-sourdine max-w-prose">Indiquez le titre exact de la page Wikipédia anglaise du club (celle qui contient « Current squad »), la lecture se relance aussitôt.</p>
            <ul className="mt-3 grid gap-2">
              {sansEffectif.map((c) => (
                <li key={c.id}>
                  <form action={setWikiTitle} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="_back" value="/studio/donnees" />
                    <span className="font-semibold w-48 truncate">{c.name}</span>
                    <label className="sr-only" htmlFor={`w-${c.id}`}>Page Wikipédia de {c.name}</label>
                    <input id={`w-${c.id}`} name="wiki_title" defaultValue={c.wiki_title ?? ""} placeholder="ex. Stade Toulousain" className="champ !py-1 max-w-xs" />
                    <button className="bouton-discret !py-1 !px-3 text-xs">Relire</button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="h-journal">
        <h2 id="h-journal" className="text-xl font-bold mb-3">Journal</h2>
        {(runs ?? []).length === 0 ? <p className="text-sourdine">Aucune synchronisation pour l&apos;instant.</p> : (
          <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-sourdine text-xs border-b border-trait">
                <th className="px-3 py-2 font-semibold">Quand</th><th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Tâche</th><th className="px-3 py-2 font-semibold">Appels</th><th className="px-3 py-2 font-semibold">Résultat</th>
              </tr></thead>
              <tbody>
                {(runs ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-trait last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtRelative(r.created_at)}</td>
                    <td className="px-3 py-2">{SOURCES[r.provider] ?? r.provider}</td>
                    <td className="px-3 py-2">{r.job}</td>
                    <td className="px-3 py-2 tnum">{r.calls || ""}</td>
                    <td className={`px-3 py-2 ${r.ok ? "" : "text-alerte font-semibold"}`}><span className="line-clamp-3" title={r.message}>{r.message}</span></td>
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
