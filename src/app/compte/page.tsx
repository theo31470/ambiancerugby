import Link from "next/link";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import MatchRow from "@/components/MatchRow";
import Forme from "@/components/algo/Forme";
import { Ballon, Echarpe } from "@/components/deco/Icones";
import { createClient, getViewer, hasBadge, publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT, TEAM_LITE } from "@/lib/queries";
import { getForms, getRatings } from "@/lib/algo";
import { fmtDate } from "@/lib/format";
import type { MatchFull, TeamLite } from "@/lib/types";

export const metadata: Metadata = { title: "Mon espace" };

export default async function ComptePage() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const [{ data: favTeams }, { data: favPlayers }] = await Promise.all([
    supabase.from("favorite_teams").select(`team:teams(${TEAM_LITE})`).eq("user_id", viewer.id),
    supabase.from("favorite_players").select("player:players(slug,first_name,last_name,position)").eq("user_id", viewer.id),
  ]);
  const teams = (favTeams ?? []).map((r) => r.team as unknown as TeamLite).filter(Boolean);
  if (viewer.favorite_team_id && !teams.some((t) => t.id === viewer.favorite_team_id)) {
    const { data } = await publicClient().from("teams").select(TEAM_LITE).eq("id", viewer.favorite_team_id).maybeSingle();
    if (data) teams.unshift(data as unknown as TeamLite);
  }
  const ids = teams.map((t) => t.id);
  let next: MatchFull[] = [];
  if (ids.length) {
    const list = ids.join(",");
    const { data } = await publicClient().from("matches").select(MATCH_SELECT)
      .or(`home_team_id.in.(${list}),away_team_id.in.(${list})`)
      .in("status", ["scheduled", "live", "halftime"]).order("kickoff_at").limit(6);
    next = (data ?? []) as unknown as MatchFull[];
  }
  const [ratings, forms] = ids.length ? await Promise.all([getRatings(ids), getForms(ids)]) : [new Map(), new Map()];
  const badge = hasBadge(viewer);
  const players = (favPlayers ?? []).map((r) => r.player as unknown as { slug: string; first_name: string; last_name: string } | null).filter(Boolean);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-12 content-start min-w-0">
        <section aria-labelledby="h-clubs">
          <h2 id="h-clubs" className="groovy text-3xl text-vin mb-4">Mes clubs</h2>
          {teams.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {teams.map((t) => {
                const r = ratings.get(t.id);
                const f = forms.get(t.id);
                return (
                  <li key={t.id}>
                    <Link href={`/clubs/${t.slug}`} className="carte-vie flex items-center gap-3 bg-surface border border-trait rounded-2xl p-4">
                      <TeamBadge team={t} size="md" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold truncate">{t.short_name ?? t.name}</span>
                        <span className="block text-xs text-sourdine">{r ? `Indice ${Math.round(r.rating)}${r.rank ? `, ${r.rank}e` : ""}` : "Indice à venir"}</span>
                      </span>
                      {f && <Forme f={f} compact />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bg-surface border border-dashed border-trait rounded-2xl p-8 text-center">
              <Echarpe className="w-14 h-auto mx-auto text-vin" />
              <p className="mt-3 font-semibold">Vous ne suivez encore aucun club.</p>
              <p className="text-sm text-sourdine mt-1">Touchez « Suivre » sur la fiche d&apos;un club pour le retrouver ici avec ses matchs.</p>
              <Link href="/clubs" className="bouton mt-4">Choisir mes clubs</Link>
            </div>
          )}
        </section>

        {next.length > 0 && (
          <section aria-labelledby="h-agenda">
            <h2 id="h-agenda" className="groovy text-3xl text-vin mb-4">Leurs prochains matchs</h2>
            <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
              {next.map((m) => <li key={m.id}><MatchRow m={m} showDate /></li>)}
            </ul>
          </section>
        )}

        {players.length > 0 && (
          <section aria-labelledby="h-joueurs">
            <h2 id="h-joueurs" className="groovy text-3xl text-vin mb-4">Mes joueurs</h2>
            <ul className="flex flex-wrap gap-2">
              {players.map((p) => p && <li key={p.slug}><Link href={`/joueurs/${p.slug}`} className="bouton-discret">{p.first_name} {p.last_name}</Link></li>)}
            </ul>
          </section>
        )}
      </div>

      <aside className="content-start grid gap-5">
        <section aria-labelledby="h-abo" className={`rounded-[1.5rem] p-6 ${badge ? "bg-moutarde text-bordeaux" : "bg-bordeaux text-white"}`}>
          <h2 id="h-abo" className="groovy text-2xl">{badge ? "Vous êtes Supporter" : "Formule gratuite"}</h2>
          {badge ? (
            <p className="mt-2 text-sm">Merci de faire vivre Ambiance Rugby !{viewer.plan_until ? ` Votre abonnement court jusqu'au ${fmtDate(viewer.plan_until)}.` : ""}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-white/80">Passez Supporter pour les stats complètes, les alertes de match, les contenus exclusifs et le badge.</p>
              <Link href="/abonnement" className="bouton-or mt-4"><Ballon className="tourne w-6" />2,99 € / mois</Link>
            </>
          )}
        </section>
        <section className="bg-surface border border-trait rounded-[1.5rem] p-5 text-sm">
          <h2 className="font-bold">Alertes de match</h2>
          <p className="text-sourdine mt-1">
            {badge ? "Vous recevez le coup d'envoi, les essais et le score final de vos clubs." : "Réservées aux Supporters : coup d'envoi, essais et score final de vos clubs."}
          </p>
          <Link href="/compte/alertes" className="text-vin font-semibold underline underline-offset-4 mt-2 inline-block">Voir mes alertes</Link>
        </section>
      </aside>
    </div>
  );
}
