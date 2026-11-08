import Link from "next/link";
import { EVENT_LABEL, EVENT_POINTS } from "@/lib/format";

type Evt = { id: string; minute: number | null; kind: string; text: string | null; team_id: string | null; player: unknown };
type Equipe = { id: string; name: string; short_name: string | null; color?: string | null };

const PICTO: Record<string, string> = { try: "🏉", penalty_try: "🏉", conversion: "🎯", penalty: "🎯", drop: "🦶", yellow: "🟨", red: "🟥", sub: "🔁", note: "📣" };

/** Fil du match en deux colonnes : chaque équipe de son côté, la minute au centre, le score qui avance. */
export default function FilDuMatch({ events, home, away, live, clock }: { events: Evt[]; home: Equipe; away: Equipe; live: boolean; clock: string | null }) {
  const lignes = events.reduce<{ e: Evt; sh: number; sa: number; pts: number }[]>((acc, e) => {
    const pts = EVENT_POINTS[e.kind] ?? 0;
    const prec = acc[acc.length - 1] ?? { sh: 0, sa: 0 };
    acc.push({ e, pts, sh: prec.sh + (e.team_id === home.id ? pts : 0), sa: prec.sa + (e.team_id === away.id ? pts : 0) });
    return acc;
  }, []);
  // le plus récent en haut, comme un direct
  const ordre = [...lignes].reverse();
  return (
    <section aria-labelledby="h-faits" className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id="h-faits" className="groovy text-2xl text-vin">Le fil du match</h2>
        {live && <p className="inline-flex items-center gap-2 rounded-full bg-alerte text-white px-3 py-1 text-sm font-bold tnum"><span className="pastille" aria-hidden />{clock ? `${clock}` : "En direct"}</p>}
      </div>
      <ol className="relative grid gap-2">
        <span aria-hidden className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-trait" />
        {ordre.map(({ e, sh, sa, pts }) => {
          const domicile = e.team_id === home.id;
          const p = e.player as { slug: string; first_name: string; last_name: string } | null;
          const gros = pts > 0 || e.kind === "red";
          const carte = (
            <div className={`rounded-2xl px-4 py-2.5 ${gros ? "bg-bordeaux text-white" : "bg-surface border border-trait"} ${domicile ? "text-right" : ""}`}>
              <p className="font-bold">
                <span aria-hidden className="mx-1">{PICTO[e.kind] ?? "•"}</span>{EVENT_LABEL[e.kind] ?? e.kind}
                {pts > 0 && <span className="ml-2 titre tnum text-moutarde">{sh}–{sa}</span>}
              </p>
              {p && <Link href={`/joueurs/${p.slug}`} className="text-sm underline underline-offset-2">{p.first_name} {p.last_name}</Link>}
              {e.text && <p className={`text-sm ${gros ? "text-white/75" : "text-sourdine"}`}>{e.text}</p>}
            </div>
          );
          return (
            <li key={e.id} className="relative grid grid-cols-[1fr_3.5rem_1fr] items-center gap-2">
              <div>{domicile && carte}</div>
              <span className={`relative z-10 mx-auto grid place-items-center w-12 h-12 rounded-full titre font-extrabold tnum text-sm border-2 ${gros ? "bg-moutarde text-bordeaux border-moutarde" : "bg-fond border-trait"}`}>
                {e.minute != null ? `${e.minute}'` : "–"}
              </span>
              <div>{!domicile && carte}</div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-sourdine text-center">{home.short_name ?? home.name} à gauche, {away.short_name ?? away.name} à droite. Le plus récent en haut.</p>
    </section>
  );
}
