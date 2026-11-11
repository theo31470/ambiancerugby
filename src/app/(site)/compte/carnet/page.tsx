import Link from "next/link";
import { urlMatch } from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TeamBadge from "@/components/TeamBadge";
import PartagerRecap from "@/components/carnet/PartagerRecap";
import { createClient, getViewer } from "@/lib/supabase/server";
import { TEAM_LITE } from "@/lib/queries";
import { fmtDay } from "@/lib/format";
import type { TeamLite } from "@/lib/types";

export const metadata: Metadata = { title: "Mon carnet de supporter", robots: { index: false } };
export const dynamic = "force-dynamic";

type Presence = {
  cris: number; team_id: string | null; premier_cri: string;
  match: { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; home_team_id: string; away_team_id: string; home: TeamLite; away: TeamLite; competition: { short_name: string | null; name: string } };
};

/** Le carnet : chaque match suivi depuis la tribune en direct y est tamponné. */
export default async function Carnet() {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion?suite=/compte/carnet");
  const { data } = await (await createClient()).from("match_presences")
    .select(`cris, team_id, premier_cri, match:matches(id,kickoff_at,status,home_score,away_score,home_team_id,away_team_id, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE}), competition:competitions(short_name,name))`)
    .eq("user_id", viewer.id).order("premier_cri", { ascending: false }).limit(300);
  const presences = (data ?? []) as unknown as Presence[];
  const issue = (p: Presence) => {
    const m = p.match;
    if (m.status !== "finished" || m.home_score == null || m.away_score == null || !p.team_id) return null;
    const pour = p.team_id === m.home_team_id ? m.home_score : m.away_score, contre = p.team_id === m.home_team_id ? m.away_score : m.home_score;
    return pour > contre ? "V" : pour < contre ? "D" : "N";
  };
  const victoires = presences.filter((p) => issue(p) === "V").length;
  const cris = presences.reduce((s, p) => s + p.cris, 0);
  const camps = new Map<string, { team: TeamLite; n: number }>();
  for (const p of presences) {
    if (!p.team_id) continue;
    const t = p.team_id === p.match.home_team_id ? p.match.home : p.match.away;
    camps.set(t.id, { team: t, n: (camps.get(t.id)?.n ?? 0) + 1 });
  }
  const coeur = [...camps.values()].sort((a, b) => b.n - a.n)[0]?.team ?? null;

  if (!viewer.supporter) {
    return (
      <div className="max-w-2xl">
        <h2 className="groovy text-4xl text-vin">Mon carnet de supporter</h2>
        <p className="mt-2 text-sourdine">Chaque match que vous suivez depuis la tribune en direct est tamponné dans votre carnet, avec le score, votre camp et vos cris. En fin de saison, votre récap à partager.</p>
        <div className="mt-6 relative rounded-3xl bg-bordeaux text-white p-6 overflow-hidden">
          <p className="titre text-5xl font-extrabold tnum">{presences.length}</p>
          <p className="text-white/70">match{presences.length > 1 ? "s" : ""} déjà dans votre carnet</p>
          <p className="mt-4">Le carnet complet est réservé aux Supporters.</p>
          <Link href="/abonnement" className="bouton-or mt-4">Devenir Supporter</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="groovy text-4xl text-vin">Mon carnet de supporter</h2>
          <p className="mt-1 text-sourdine">Chaque match suivi depuis la tribune en direct y est tamponné.</p>
        </div>
        {presences.length > 0 && <PartagerRecap texte={`Mon carnet Ambiance Rugby : ${presences.length} matchs suivis en tribune, ${victoires} victoires vues, ${cris.toLocaleString("fr-FR")} cris poussés${coeur ? ` pour ${coeur.short_name ?? coeur.name}` : ""} !`} />}
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat v={presences.length} l="matchs suivis" />
        <Stat v={victoires} l="victoires vues" />
        <Stat v={cris} l="cris poussés" />
        <div className="rounded-2xl bg-bordeaux text-white p-4 flex items-center gap-3">
          {coeur ? <><TeamBadge team={coeur} size="md" /><span><span className="block text-xs text-white/60">Mon camp</span><span className="font-bold">{coeur.short_name ?? coeur.name}</span></span></> : <span className="text-white/70 text-sm">Choisissez un camp dans la tribune</span>}
        </div>
      </div>

      {presences.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presences.map((p) => {
            const m = p.match, r = issue(p);
            return (
              <li key={m.id}>
                <Link href={urlMatch(m)} className="carte-vie relative block rounded-2xl border-2 border-dashed border-trait bg-surface p-4 overflow-hidden">
                  <span className="text-xs text-sourdine">{fmtDay(m.kickoff_at, { day: "numeric", month: "short", year: "numeric" })} · {m.competition.short_name ?? m.competition.name}</span>
                  {(["home", "away"] as const).map((s) => {
                    const t = m[s], sc = s === "home" ? m.home_score : m.away_score;
                    return (
                      <span key={s} className={`mt-1.5 flex items-center gap-2 ${p.team_id === t.id ? "font-bold" : ""}`}>
                        <TeamBadge team={t} size="xs" /><span className="flex-1 truncate">{t.short_name ?? t.name}</span>
                        <span className="titre font-extrabold tnum">{m.status === "finished" ? sc : ""}</span>
                      </span>
                    );
                  })}
                  <span className="mt-2 block text-xs text-sourdine tnum">{p.cris} cri{p.cris > 1 ? "s" : ""} poussé{p.cris > 1 ? "s" : ""}</span>
                  {r && (
                    <span aria-label={r === "V" ? "Victoire" : r === "D" ? "Défaite" : "Nul"}
                      className={`absolute right-3 bottom-3 -rotate-12 rounded-lg border-[3px] px-2 py-0.5 groovy text-lg ${r === "V" ? "border-ok text-ok" : r === "D" ? "border-alerte text-alerte" : "border-sourdine text-sourdine"}`}>
                      {r === "V" ? "Gagné" : r === "D" ? "Perdu" : "Nul"}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 bg-surface border border-trait rounded-2xl p-5 text-sourdine">Votre carnet est vide. Pendant le prochain match, ouvrez sa fiche, choisissez votre tribune et poussez vos cris : le match sera tamponné ici.</p>
      )}
    </div>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return <div className="rounded-2xl bg-surface border border-trait p-4"><p className="titre text-3xl font-extrabold tnum text-vin">{v.toLocaleString("fr-FR")}</p><p className="text-sm text-sourdine">{l}</p></div>;
}
