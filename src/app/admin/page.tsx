import Link from "next/link";
import { isoFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { fmtRelative } from "@/lib/format";
import MatchRow from "@/components/MatchRow";
import type { MatchFull } from "@/lib/types";

export default async function AdminHome() {
  const db = await createClient();
  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count ?? 0;
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [articles, drafts, matches, teams, players, users, runs, used, live] = await Promise.all([
    count("articles"),
    db.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft").then((r) => r.count ?? 0),
    count("matches"),
    count("teams"),
    count("players"),
    count("profiles"),
    db.from("sync_runs").select("*").order("id", { ascending: false }).limit(1),
    db.from("sync_runs").select("calls").eq("provider", "oanor").gte("created_at", monthStart.toISOString()),
    db.from("matches").select(MATCH_SELECT).eq("source", "manual").gte("kickoff_at", isoFromNow(-6 * 3600e3)).lte("kickoff_at", isoFromNow(36 * 3600e3)).order("kickoff_at").limit(10),
  ]);
  const lastRun = runs.data?.[0];
  const quota = (used.data ?? []).reduce((a, r) => a + r.calls, 0);

  const stats = [
    { label: "Articles", value: articles, sub: drafts ? `${drafts} brouillon${drafts > 1 ? "s" : ""}` : "aucun brouillon", href: "/admin/articles" },
    { label: "Matchs", value: matches, href: "/admin/matchs" },
    { label: "Équipes", value: teams, href: "/admin/clubs" },
    { label: "Joueurs", value: players, href: "/admin/joueurs" },
    { label: "Inscrits", value: users, href: "/admin/utilisateurs" },
  ];

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold mr-auto">Tableau de bord</h1>
        <Link href="/admin/articles/nouveau" className="bouton">Écrire un article</Link>
        <Link href="/admin/matchs/nouveau" className="bouton-discret">Ajouter un match</Link>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-surface border border-trait rounded-lg p-4 hover:border-vin">
            <dt className="text-sm text-sourdine">{s.label}</dt>
            <dd className="titre text-3xl font-extrabold tnum">{s.value}</dd>
            {s.sub && <dd className="text-xs text-sourdine">{s.sub}</dd>}
          </Link>
        ))}
      </dl>

      <section aria-labelledby="h-direct">
        <h2 id="h-direct" className="text-xl font-bold">Matchs saisis par la rédaction, aujourd&apos;hui et demain</h2>
        <p className="text-sm text-sourdine mb-3">Pro D2, Six Nations, Challenge Cup… Ouvrez un match pour saisir le score en direct.</p>
        {(live.data ?? []).length ? (
          <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait overflow-hidden">
            {(live.data as unknown as MatchFull[]).map((m) => (
              <li key={m.id} className="flex items-center">
                <div className="flex-1 min-w-0"><MatchRow m={m} showDate /></div>
                <Link href={`/admin/matchs/${m.id}`} className="bouton-discret mr-3 shrink-0">Saisir</Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sourdine">Rien de prévu.</p>}
      </section>

      <section aria-labelledby="h-sync" className="bg-surface border border-trait rounded-lg p-5">
        <h2 id="h-sync" className="text-xl font-bold">Données automatiques</h2>
        <p className="mt-1 text-sm text-sourdine tnum">{quota} appels Oanor ce mois-ci sur 2 800 autorisés par le site (offre gratuite : 3 000).</p>
        {lastRun ? (
          <p className={`mt-3 text-sm ${lastRun.ok ? "" : "text-alerte font-semibold"}`}>
            Dernière synchronisation {fmtRelative(lastRun.created_at)} : {lastRun.ok ? "réussie" : "en échec"}. {lastRun.message}
          </p>
        ) : <p className="mt-3 text-sm">Aucune synchronisation pour l&apos;instant.</p>}
        <Link href="/admin/donnees" className="mt-4 bouton-discret">Gérer les données</Link>
      </section>
    </div>
  );
}
