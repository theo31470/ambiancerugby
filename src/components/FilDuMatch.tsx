import Link from "next/link";
import { EVENT_LABEL, EVENT_POINTS } from "@/lib/format";
import { phraseAction } from "@/lib/commentaires";
import ChronoLive from "./ChronoLive";

type Evt = { id: string; minute: number | null; kind: string; text: string | null; team_id: string | null; player: unknown };
type Equipe = { id: string; name: string; short_name: string | null };
const PICTO: Record<string, string> = { try: "🏉", penalty_try: "🏉", conversion: "🎯", penalty: "🎯", drop: "🦶", yellow: "🟨", red: "🟥", sub: "🔁", note: "📣" };

/**
 * Fil du match à la Flashscore : dans l'ordre du match, un bandeau par mi-temps avec son score,
 * l'équipe qui reçoit à gauche, les visiteurs à droite, le score après chaque point marqué.
 */
export default function FilDuMatch({ events, home, away, live, clock, kickoff, updatedAt, status }: { events: Evt[]; home: Equipe; away: Equipe; live: boolean; clock: string | null; kickoff: string; updatedAt: string | null; status: string }) {
  const lignes = events.reduce<{ e: Evt; sh: number; sa: number; pts: number }[]>((acc, e) => {
    const pts = EVENT_POINTS[e.kind] ?? 0;
    const p = acc[acc.length - 1] ?? { sh: 0, sa: 0 };
    acc.push({ e, pts, sh: p.sh + (e.team_id === home.id ? pts : 0), sa: p.sa + (e.team_id === away.id ? pts : 0) });
    return acc;
  }, []);
  const mt = [lignes.filter((l) => (l.e.minute ?? 0) <= 40), lignes.filter((l) => (l.e.minute ?? 0) > 40)];
  const scoreA = (ls: typeof lignes, i: number) => {
    const avant = i === 0 ? { sh: 0, sa: 0 } : (mt[0][mt[0].length - 1] ?? { sh: 0, sa: 0 });
    const fin = ls[ls.length - 1] ?? avant;
    return `${fin.sh - avant.sh} – ${fin.sa - avant.sa}`;
  };
  const nom = (t: Equipe) => t.short_name ?? t.name;

  const cote = (l: (typeof lignes)[number], domicile: boolean) => {
    const p = l.e.player as { slug: string; first_name: string; last_name: string } | null;
    const qui = p ? <Link href={`/joueurs/${p.slug}`} className="font-semibold hover:underline underline-offset-2">{p.first_name.slice(0, 1)}. {p.last_name}</Link> : null;
    return (
      <div className={`flex items-center gap-2 min-w-0 ${domicile ? "" : "flex-row-reverse text-right"}`}>
        <span aria-hidden className="shrink-0">{PICTO[l.e.kind] ?? "•"}</span>
        {l.pts > 0 && <span className="shrink-0 rounded bg-bordeaux text-white titre font-extrabold tnum text-xs px-1.5 py-0.5">{l.sh} – {l.sa}</span>}
        <span className="min-w-0 truncate">
          {qui}{qui && " "}
          <span className="text-sourdine text-sm">{l.e.kind === "sub" ? l.e.text ?? EVENT_LABEL.sub : `${p ? "" : `${l.e.text ?? ""} `}${EVENT_LABEL[l.e.kind] ?? l.e.kind}`.trim()}</span>
        </span>
      </div>
    );
  };

  return (
    <section aria-labelledby="h-faits" className="mt-10 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="h-faits" className="groovy text-2xl text-vin">Le fil du match</h2>
        {live && <p className="inline-flex items-center gap-2 rounded-full bg-alerte text-white px-3 py-1 text-sm font-bold tnum"><span className="pastille" aria-hidden /><ChronoLive kickoff={kickoff} clock={clock} updatedAt={updatedAt} status={status} /></p>}
      </div>
      <div className="bg-surface border border-trait rounded-2xl overflow-hidden">
        <div className="grid grid-cols-2 text-xs font-bold text-sourdine px-4 py-2 border-b border-trait">
          <span>{nom(home)}</span><span className="text-right">{nom(away)}</span>
        </div>
        {mt.map((ls, i) => ls.length > 0 && (
          <div key={i}>
            <p className="flex justify-between bg-teinte px-4 py-1.5 text-sm font-bold">
              <span>{i === 0 ? "1re mi-temps" : "2e mi-temps"}</span><span className="tnum">{scoreA(ls, i)}</span>
            </p>
            <ol>
              {ls.map((l) => {
                const domicile = l.e.team_id !== away.id;
                return (
                  <li key={l.e.id} className={`grid grid-cols-[1fr_3rem_1fr] items-center gap-2 px-4 py-2 border-b border-trait last:border-0 ${l.pts > 0 || l.e.kind === "red" ? "" : "text-sm"}`}>
                    <div className="min-w-0">{domicile && cote(l, true)}</div>
                    <span className="text-center titre font-extrabold tnum text-vin">{l.e.minute != null ? `${l.e.minute}'` : ""}</span>
                    <div className="min-w-0">{!domicile && cote(l, false)}</div>
                    {(() => {
                      const p = l.e.player as { first_name: string; last_name: string } | null;
                      const phrase = l.e.kind === "note" ? null : phraseAction(l.e.kind, l.e.id, p ? `${p.first_name} ${p.last_name}` : null, nom(domicile ? home : away));
                      return phrase && <p className={`col-span-3 text-sm italic text-sourdine ${domicile ? "" : "text-right"}`}>{phrase}</p>;
                    })()}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
