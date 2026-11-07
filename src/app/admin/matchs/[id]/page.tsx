import Link from "next/link";
import { notFound } from "next/navigation";
import MatchForm from "@/components/admin/MatchForm";
import Notice from "@/components/admin/Notice";
import TeamBadge from "@/components/TeamBadge";
import { addEvent, deleteEvent, setMatchStatus } from "../../actions";
import { createClient, publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { EVENT_LABEL, STATUS_LABEL } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

const QUICK = [
  { kind: "try", label: "Essai", pts: "+5" },
  { kind: "conversion", label: "Transfo", pts: "+2" },
  { kind: "penalty", label: "Pénalité", pts: "+3" },
  { kind: "drop", label: "Drop", pts: "+3" },
  { kind: "penalty_try", label: "Essai de pénalité", pts: "+7" },
];

export default async function AdminMatch({ params, searchParams }: PageProps<"/admin/matchs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const m = data as unknown as MatchFull;
  const pub = publicClient();
  const [{ data: comps }, { data: teams }, { data: events }, { data: players }] = await Promise.all([
    pub.from("competitions").select("id,name,current_season").order("sort_order"),
    pub.from("teams").select("id,name").order("name"),
    pub.from("match_events").select("*, player:players(first_name,last_name)").eq("match_id", id).order("minute", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    pub.from("players").select("id,first_name,last_name,team_id").in("team_id", [m.home_team_id, m.away_team_id]).order("last_name"),
  ]);
  const back = `/admin/matchs/${id}`;

  return (
    <div className="grid gap-10">
      <div>
        <Link href="/admin/matchs" className="text-sm text-sourdine underline underline-offset-4">Tous les matchs</Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">{m.home.name} – {m.away.name}</h1>
        <p className="text-sourdine">{m.competition.name}{m.source !== "manual" && ", mis à jour automatiquement"}</p>
      </div>
      <Notice sp={sp} />

      <section aria-labelledby="h-direct" className="bg-bordeaux text-white rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="h-direct" className="text-xl font-bold">Saisie en direct</h2>
          <p className="text-sm text-white/70">Statut : <span className="font-semibold text-white">{STATUS_LABEL[m.status]}</span>{m.clock && `, ${m.clock}`}</p>
        </div>
        <p className="mt-4 text-center titre font-extrabold text-5xl tnum">
          {m.home_score ?? 0} <span className="text-white/40">–</span> {m.away_score ?? 0}
        </p>
        <p className="text-center text-sm text-white/70 tnum">Essais {m.home_tries ?? 0} – {m.away_tries ?? 0}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {(["live", "halftime", "finished", "postponed"] as const).map((s) => (
            <form key={s} action={setMatchStatus}>
              <input type="hidden" name="match_id" value={m.id} />
              <input type="hidden" name="status" value={s} />
              <input type="hidden" name="_back" value={back} />
              <button className={`rounded-md px-3 py-1.5 text-sm font-semibold ${m.status === s ? "bg-moutarde text-bordeaux" : "bg-white/10 hover:bg-white/20"}`}>
                {s === "live" ? (m.status === "halftime" ? "Reprise (2e mi-temps)" : "Coup d'envoi") : s === "halftime" ? "Mi-temps" : s === "finished" ? "Fin du match" : "Reporté"}
              </button>
            </form>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[m.home, m.away].map((t) => (
            <form key={t.id} action={addEvent} className="bg-white/5 rounded-lg p-4 grid gap-3">
              <input type="hidden" name="match_id" value={m.id} />
              <input type="hidden" name="team_id" value={t.id} />
              <input type="hidden" name="_back" value={back} />
              <p className="flex items-center gap-2 font-bold"><TeamBadge team={t} size="sm" />{t.name}</p>
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <div>
                  <label htmlFor={`min-${t.id}`} className="text-xs text-white/70">Minute</label>
                  <input id={`min-${t.id}`} name="minute" type="number" min={0} max={130} className="champ !bg-white/10 !text-white !border-white/20" />
                </div>
                <div>
                  <label htmlFor={`pl-${t.id}`} className="text-xs text-white/70">Joueur (facultatif)</label>
                  <select id={`pl-${t.id}`} name="player_id" className="champ !bg-white/10 !text-white !border-white/20">
                    <option value="">—</option>
                    {(players ?? []).filter((p) => p.team_id === t.id).map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button key={q.kind} name="kind" value={q.kind} className="rounded-md bg-moutarde text-bordeaux px-3 py-2 text-sm font-bold hover:brightness-105">
                    {q.label} <span className="tnum">{q.pts}</span>
                  </button>
                ))}
                <button name="kind" value="yellow" className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">Jaune</button>
                <button name="kind" value="red" className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">Rouge</button>
              </div>
            </form>
          ))}
        </div>

        {(events ?? []).length > 0 && (
          <ol className="mt-6 grid gap-1 text-sm">
            {(events ?? []).map((e) => {
              const team = e.team_id === m.home_team_id ? m.home : e.team_id === m.away_team_id ? m.away : null;
              const p = e.player as { first_name: string; last_name: string } | null;
              return (
                <li key={e.id} className="flex items-center gap-3 bg-white/5 rounded px-3 py-1.5">
                  <span className="tnum w-10 font-bold">{e.minute != null ? `${e.minute}'` : ""}</span>
                  <span className="flex-1">{EVENT_LABEL[e.kind] ?? e.kind}{team && `, ${team.short_name ?? team.name}`}{p && ` (${p.first_name} ${p.last_name})`}</span>
                  <form action={deleteEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="match_id" value={m.id} />
                    <input type="hidden" name="_back" value={back} />
                    <button className="text-xs underline underline-offset-2 text-white/70 hover:text-white">Annuler</button>
                  </form>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="h-fiche">
        <h2 id="h-fiche" className="text-xl font-bold mb-4">Fiche du match</h2>
        <MatchForm match={m} competitions={comps ?? []} teams={teams ?? []} back={back} />
      </section>
    </div>
  );
}
