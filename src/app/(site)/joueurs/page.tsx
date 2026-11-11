/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import { searchPlayers } from "@/lib/queries";
import { POSITIONS } from "@/lib/format";

export const metadata: Metadata = { title: "Joueurs" };
export const dynamic = "force-dynamic";

export default async function JoueursPage({ searchParams }: PageProps<"/joueurs">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const poste = typeof sp.poste === "string" && POSITIONS[sp.poste] ? sp.poste : "";
  const players = await searchPlayers(q, poste || undefined, 90);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="groovy text-5xl sm:text-6xl text-vin">Joueurs</h1>
        <Link href="/joueurs/comparer" className="bouton-discret">Comparer deux joueurs</Link>
      </div>
      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Nom du joueur</label>
        <input id="q" name="q" defaultValue={q} placeholder="Rechercher un joueur" className="champ max-w-xs" />
        <label htmlFor="poste" className="sr-only">Poste</label>
        <select id="poste" name="poste" defaultValue={poste} className="champ max-w-[13rem]">
          <option value="">Tous les postes</option>
          {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bouton">Rechercher</button>
      </form>

      {players.length === 0 ? (
        <p className="mt-8 bg-surface border border-trait rounded-2xl p-5 text-sourdine">
          {q || poste ? "Aucun joueur ne correspond. Essayez un autre nom ou un autre poste." : "Les effectifs se remplissent automatiquement, revenez dans quelques minutes."}
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <li key={p.id}>
              <Link href={`/joueurs/${p.slug}`} className="flex items-center gap-3 bg-surface border border-trait rounded-2xl p-3 hover:border-vin carte-vie">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-teinte" loading="lazy" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-teinte grid place-items-center titre font-bold text-vin text-lg">{p.last_name.slice(0, 1)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold truncate">{p.first_name} {p.last_name}</span>
                  <span className="block text-sm text-sourdine truncate">{p.position ? POSITIONS[p.position] : "Poste non renseigné"}</span>
                </span>
                {p.team && <TeamBadge team={p.team} size="sm" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
