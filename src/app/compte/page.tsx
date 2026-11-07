import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import MatchRow from "@/components/MatchRow";
import ProfileForm from "@/components/ProfileForm";
import { signOut } from "@/app/actions";
import { createClient, getViewer, publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT, TEAM_LITE } from "@/lib/queries";
import type { MatchFull, TeamLite } from "@/lib/types";

export const metadata: Metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion?suite=/compte");
  const supabase = await createClient();
  const [{ data: favTeams }, { data: favPlayers }, { data: allTeams }] = await Promise.all([
    supabase.from("favorite_teams").select(`team:teams(${TEAM_LITE})`).eq("user_id", viewer.id),
    supabase.from("favorite_players").select("player:players(slug,first_name,last_name)").eq("user_id", viewer.id),
    publicClient().from("teams").select("id,name").order("name"),
  ]);
  const teams = (favTeams ?? []).map((r) => r.team as unknown as TeamLite).filter(Boolean);
  const ids = [...new Set([...teams.map((t) => t.id), ...(viewer.favorite_team_id ? [viewer.favorite_team_id] : [])])];

  let next: MatchFull[] = [];
  if (ids.length) {
    const list = ids.join(",");
    const { data } = await publicClient()
      .from("matches")
      .select(MATCH_SELECT)
      .or(`home_team_id.in.(${list}),away_team_id.in.(${list})`)
      .in("status", ["scheduled", "live", "halftime"])
      .order("kickoff_at")
      .limit(8);
    next = (data ?? []) as unknown as MatchFull[];
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
      <div className="grid gap-10 content-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Bonjour {viewer.display_name ?? ""}</h1>
          <p className="mt-1 text-sourdine">{viewer.email}</p>
        </div>

        <section aria-labelledby="h-agenda">
          <h2 id="h-agenda" className="text-xl font-bold mb-3">Les prochains matchs de vos clubs</h2>
          {next.length ? (
            <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait overflow-hidden">
              {next.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
            </ul>
          ) : (
            <p className="text-sourdine">Suivez un club depuis sa fiche pour voir ses matchs ici. <Link href="/clubs" className="text-vin font-semibold underline underline-offset-4">Parcourir les clubs</Link></p>
          )}
        </section>

        <section aria-labelledby="h-fav">
          <h2 id="h-fav" className="text-xl font-bold mb-3">Vos favoris</h2>
          {teams.length === 0 && (favPlayers ?? []).length === 0 ? (
            <p className="text-sourdine">Aucun favori pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link href={`/clubs/${t.slug}`} className="inline-flex items-center gap-2 bouton-discret"><TeamBadge team={t} size="xs" />{t.short_name ?? t.name}</Link>
                </li>
              ))}
              {(favPlayers ?? []).map((r) => {
                const p = r.player as unknown as { slug: string; first_name: string; last_name: string };
                return p && (
                  <li key={p.slug}><Link href={`/joueurs/${p.slug}`} className="bouton-discret">{p.first_name} {p.last_name}</Link></li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <aside className="grid gap-6 content-start">
        <section aria-labelledby="h-profil" className="bg-surface border border-trait rounded-lg p-5">
          <h2 id="h-profil" className="text-lg font-bold mb-4">Profil</h2>
          <ProfileForm viewer={viewer} teams={(allTeams ?? []) as { id: string; name: string }[]} />
        </section>
        <form action={signOut}>
          <button className="bouton-discret w-full">Se déconnecter</button>
        </form>
      </aside>
    </div>
  );
}
