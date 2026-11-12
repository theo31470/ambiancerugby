import { publicClient } from "@/lib/supabase/server";

type Titre = { titre: string; ordre: number; annees: number[]; note: string | null };

/** Palmarès du club ou de la sélection : chaque trophée, son nombre et ses années. */
export default async function Palmares({ teamId, nom }: { teamId: string; nom: string }) {
  const { data } = await publicClient().from("palmares").select("titre,ordre,annees,note").eq("team_id", teamId).order("ordre");
  const titres = ((data ?? []) as Titre[]).filter((t) => t.annees.length);
  if (!titres.length) return null;
  const total = titres.reduce((n, t) => n + t.annees.length, 0);
  const dernier = Math.max(...titres.flatMap((t) => t.annees));

  return (
    <section aria-labelledby="h-palmares" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <h2 id="h-palmares" className="groovy text-3xl text-vin">Palmarès</h2>
        <p className="text-sm text-sourdine">{total} titre{total > 1 ? "s" : ""} majeur{total > 1 ? "s" : ""}, le dernier en {dernier}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {titres.map((t, i) => {
          const annees = [...t.annees].sort((a, b) => b - a);
          return (
            <li key={t.titre} className={`rounded-2xl p-5 ${i === 0 ? "bg-bordeaux text-white" : "bg-surface border border-trait"}`}>
              <p className="flex items-baseline gap-3">
                <span className={`groovy text-6xl leading-none tnum ${i === 0 ? "text-moutarde" : "text-vin"}`}>{t.annees.length}</span>
                <span className="font-extrabold text-lg leading-tight">{t.titre}</span>
              </p>
              <p className={`mt-3 text-sm tnum leading-relaxed ${i === 0 ? "text-white/80" : "text-sourdine"}`}>{annees.join(" · ")}</p>
              {t.note && <p className={`mt-2 text-xs ${i === 0 ? "text-white/60" : "text-sourdine"}`}>{t.note.charAt(0).toUpperCase() + t.note.slice(1)}.</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-sourdine">Titres de {nom} en championnat de France, en coupes d&apos;Europe et, pour les sélections, en Coupe du monde et au Tournoi.</p>
    </section>
  );
}
