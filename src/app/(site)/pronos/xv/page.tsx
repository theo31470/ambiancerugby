import Link from "next/link";
import type { Metadata } from "next";
import ComposerXV from "@/components/xv/ComposerXV";
import TerrainXV from "@/components/xv/TerrainXV";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { candidats, semaineActive, type Candidat } from "@/lib/xv";

export const metadata: Metadata = { title: "XV de la semaine" };
export const dynamic = "force-dynamic";

export default async function XVPage() {
  const viewer = await getViewer();
  const s = await semaineActive();
  const parPoste = await candidats(s.debut, s.fin);
  const tous = new Map<string, Candidat>();
  for (const l of parPoste.values()) for (const c of l) if (!tous.has(c.id) || (c.note ?? 0) > (tous.get(c.id)!.note ?? 0)) tous.set(c.id, c);

  // XV de l'algorithme : la meilleure note à chaque poste (un joueur par poste)
  const algo: Record<number, Candidat> = {};
  const pris = new Set<string>();
  for (let n = 1; n <= 15; n++) { const c = (parPoste.get(n) ?? []).find((x) => !pris.has(x.id)); if (c) { algo[n] = c; pris.add(c.id); } }

  // XV des Supporters : le joueur le plus choisi à chaque poste
  const { data: xvs } = await publicClient().from("xv_semaine").select("user_id, joueurs").eq("semaine", s.cle);
  const votes = new Map<number, Map<string, number>>();
  for (const x of xvs ?? []) for (const [k, v] of Object.entries(x.joueurs as Record<string, string>)) {
    const m = votes.get(Number(k)) ?? new Map(); m.set(v, (m.get(v) ?? 0) + 1); votes.set(Number(k), m);
  }
  const supporters: Record<number, Candidat> = {};
  for (const [n, m] of votes) { const [id] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? []; if (id && tous.has(id)) supporters[n] = tous.get(id)!; }
  const mien = (xvs ?? []).find((x) => x.user_id === viewer?.id)?.joueurs as Record<string, string> | undefined;

  // meilleurs sélectionneurs : somme des notes de leur XV
  const scores = (xvs ?? []).map((x) => ({ user: x.user_id, total: Object.values(x.joueurs as Record<string, string>).reduce((t, id) => t + (tous.get(id)?.note ?? 0), 0), n: Object.keys(x.joueurs as object).length }))
    .filter((x) => x.n === 15).sort((a, b) => b.total - a.total).slice(0, 10);
  const { data: profils } = scores.length ? await publicClient().from("profiles").select("id, username, display_name").in("id", scores.map((x) => x.user)) : { data: [] };
  const nomDe = (id: string) => { const p = (profils ?? []).find((x) => x.id === id); return p?.display_name ?? p?.username ?? "Supporter"; };

  const vide = parPoste.size === 0;
  return (
    <div>
      <Link href="/pronos" className="text-sm text-sourdine hover:text-vin">← Pronos</Link>
      <h1 className="groovy text-5xl sm:text-6xl text-vin mt-2">XV de la semaine</h1>
      <p className="mt-2 text-sourdine max-w-prose">Composez votre XV parmi les joueurs qui ont joué cette semaine ({s.cle.replace("-W", ", semaine ")}). Votre score, c&apos;est la somme de leurs notes. Chaque lundi, le XV des Supporters réunit les joueurs les plus choisis.</p>

      {vide ? (
        <p className="mt-6 bg-surface border border-trait rounded-2xl p-5 text-sourdine">Pas encore de match joué cette semaine : la sélection ouvre dès les premiers coups de sifflet.</p>
      ) : (
        <div className="mt-8 grid gap-10">
          <section aria-labelledby="h-mon-xv">
            <h2 id="h-mon-xv" className="titre text-2xl font-extrabold mb-3">Mon XV</h2>
            {viewer?.supporter ? (
              <ComposerXV candidats={Object.fromEntries(parPoste)} initial={mien ?? {}} />
            ) : (
              <div className="rounded-3xl bg-bordeaux text-white p-6">
                <p>Composer son XV et entrer au classement des sélectionneurs est réservé aux Supporters.</p>
                <Link href="/abonnement" className="bouton-or mt-4">Devenir Supporter</Link>
              </div>
            )}
          </section>
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="h-xv-sup">
              <h2 id="h-xv-sup" className="titre text-2xl font-extrabold mb-1">Le XV des Supporters</h2>
              <p className="text-sm text-sourdine mb-3">{(xvs ?? []).length} sélection{(xvs ?? []).length > 1 ? "s" : ""} cette semaine</p>
              {Object.keys(supporters).length ? <TerrainXV xv={supporters} /> : <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">Aucune sélection pour l&apos;instant.</p>}
            </section>
            <section aria-labelledby="h-xv-algo">
              <h2 id="h-xv-algo" className="titre text-2xl font-extrabold mb-1">Le XV de l&apos;algorithme</h2>
              <p className="text-sm text-sourdine mb-3">La meilleure note à chaque poste</p>
              <TerrainXV xv={algo} />
            </section>
          </div>
          {scores.length > 0 && (
            <section aria-labelledby="h-selec">
              <h2 id="h-selec" className="titre text-2xl font-extrabold mb-3">Les meilleurs sélectionneurs</h2>
              <ol className="bg-surface border border-trait rounded-2xl divide-y divide-trait max-w-xl">
                {scores.map((x, i) => (
                  <li key={x.user} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-8 text-center titre font-extrabold ${i < 3 ? "text-vin" : "text-sourdine"}`}>{i + 1}</span>
                    <span className="flex-1 font-semibold truncate">{nomDe(x.user)}</span>
                    <span className="titre font-extrabold tnum">{x.total.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
