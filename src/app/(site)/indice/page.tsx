import Link from "next/link";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import Forme from "@/components/algo/Forme";
import { Pastilles } from "@/components/algo/Forme";
import TitreSection from "@/components/deco/TitreSection";
import { Ballon, Poteaux } from "@/components/deco/Icones";
import { getPowerRanking } from "@/lib/algo";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Indice Ambiance : le classement de puissance des clubs",
  description: "Notre algorithme classe les clubs et sélections de rugby selon leur vraie force du moment, au-delà du simple classement.",
};
export const dynamic = "force-dynamic";

const GRATUIT = 10;

export default async function IndicePage({ searchParams }: PageProps<"/indice">) {
  const sp = await searchParams;
  const nations = sp.vue === "selections";
  const [rows, viewer] = await Promise.all([getPowerRanking(nations), getViewer()]);
  const full = !!viewer?.supporter;
  const visibles = full ? rows : rows.slice(0, GRATUIT);
  const caches = full ? 0 : Math.max(0, rows.length - GRATUIT);

  return (
    <div>
      <section className="pleine-largeur bg-bordeaux text-white -mt-6 sm:-mt-10 relative overflow-hidden">
        <Poteaux className="absolute right-4 -bottom-8 h-72 w-auto text-white/[0.06] [--deco-accent:transparent]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <h1 className="groovy text-5xl sm:text-7xl">Indice <span className="text-moutarde">Ambiance</span></h1>
          <p className="mt-4 max-w-xl text-white/80 text-lg">
            Notre algorithme maison note chaque équipe selon sa vraie force du moment. Battre un gros à l&apos;extérieur rapporte plus que battre un petit à domicile, et un carton compte plus qu&apos;une victoire d&apos;un point.
          </p>
          <nav aria-label="Type d'équipes" className="mt-8 inline-flex rounded-full bg-white/10 p-1">
            <Link href="/indice" aria-current={!nations ? "page" : undefined} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${!nations ? "bg-moutarde text-bordeaux" : "hover:bg-white/10"}`}>Clubs</Link>
            <Link href="/indice?vue=selections" aria-current={nations ? "page" : undefined} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${nations ? "bg-moutarde text-bordeaux" : "hover:bg-white/10"}`}>Sélections</Link>
          </nav>
        </div>
      </section>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Classement de puissance" className="min-w-0">
          {rows.length === 0 ? (
            <div className="bg-surface border border-dashed border-trait rounded-2xl p-10 text-center">
              <Ballon className="w-16 mx-auto text-vin" />
              <p className="mt-3 titre font-bold text-lg">L&apos;algorithme s&apos;échauffe</p>
              <p className="mt-1 text-sourdine">Le classement se calcule automatiquement dès les premiers résultats.</p>
            </div>
          ) : (
            <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
              <table className="w-full text-sm tnum">
                <thead>
                  <tr className="text-xs text-sourdine border-b border-trait">
                    <th scope="col" className="text-left font-semibold py-3 pl-4 w-10">#</th>
                    <th scope="col" className="text-left font-semibold py-3">Équipe</th>
                    <th scope="col" className="font-semibold py-3 px-2 text-right">Indice</th>
                    <th scope="col" className="font-semibold py-3 px-2 text-right" title="Évolution sur 7 jours">7 j</th>
                    <th scope="col" className="font-semibold py-3 px-2 hidden sm:table-cell">Forme</th>
                    <th scope="col" className="font-semibold py-3 px-3 hidden md:table-cell text-left">5 derniers</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r, i) => {
                    const delta = r.rating - (r.rating_7d ?? r.rating);
                    return (
                      <tr key={r.team_id} className="border-b border-trait last:border-0 hover:bg-teinte">
                        <td className="py-2.5 pl-4"><span className={`groovy text-xl ${i < 3 ? "text-vin" : "text-sourdine"}`}>{i + 1}</span></td>
                        <th scope="row" className="text-left font-normal py-2.5">
                          <Link href={`/clubs/${r.team.slug}`} className="flex items-center gap-2.5 hover:underline underline-offset-4">
                            <TeamBadge team={r.team} size="sm" />
                            <span className="font-semibold">{r.team.short_name ?? r.team.name}</span>
                          </Link>
                        </th>
                        <td className="px-2 text-right titre font-extrabold text-base">{Math.round(r.rating)}</td>
                        <td className={`px-2 text-right text-xs ${delta > 0 ? "text-ok" : delta < 0 ? "text-alerte" : "text-sourdine"}`}>
                          {delta > 0 ? `▲ ${Math.round(delta)}` : delta < 0 ? `▼ ${Math.abs(Math.round(delta))}` : "="}
                        </td>
                        <td className="px-2 text-center hidden sm:table-cell">{r.form ? <Forme f={r.form} compact /> : "–"}</td>
                        <td className="px-3 hidden md:table-cell">{r.form ? <Pastilles last5={r.form.last5} /> : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {caches > 0 && (
                <div className="border-t border-trait p-6 text-center bg-gradient-to-b from-surface to-teinte">
                  <p className="titre font-bold text-lg">Et {caches} autres équipes classées</p>
                  <p className="text-sourdine mt-1">Le classement complet, les courbes et les pronostics détaillés sont réservés aux Supporters.</p>
                  <Link href="/abonnement" className="bouton-or mt-4"><Ballon className="tourne w-6" />Devenir Supporter, 5,99 €/mois</Link>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="content-start">
          <TitreSection>La méthode</TitreSection>
          <ol className="grid gap-4 text-sm">
            {[
              ["Tout le monde part à 1500", "Chaque équipe démarre au niveau moyen, puis chaque match terminé fait bouger sa note."],
              ["Le résultat face aux attentes", "Gagner alors qu'on était donné perdant rapporte gros. Gagner un match attendu rapporte peu."],
              ["L'écart au score compte", "Un large succès fait plus bouger la note, sans exagérer quand un favori écrase un petit."],
              ["L'avantage du terrain", "Recevoir vaut environ 50 points d'Indice : une victoire à l'extérieur pèse plus."],
              ["La forme en plus", "Sur 100, d'après les 5 derniers matchs : résultats, écarts et essais, les plus récents comptent double."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="groovy text-2xl text-moutarde w-6 shrink-0">{i + 1}</span>
                <span><span className="font-semibold block">{t}</span><span className="text-sourdine">{d}</span></span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
