import Link from "next/link";
import { EVENT_LABEL, EVENT_POINTS } from "@/lib/format";

type Evt = { id: string; minute: number | null; kind: string; text: string | null; team_id: string | null; player: unknown };
type Equipe = { id: string; name: string; short_name: string | null };
const PICTO: Record<string, string> = { try: "🏉", penalty_try: "🏉", conversion: "🎯", penalty: "🎯", drop: "🦶", yellow: "🟨", red: "🟥", sub: "🔁", note: "📣" };

/**
 * Le match d'un coup d'œil : une frise 0–80' où chaque action marquante est posée à sa minute
 * (équipe qui reçoit au-dessus, visiteurs en dessous), puis le récit, du plus récent au plus ancien.
 */
export default function FilDuMatch({ events, home, away, live, clock }: { events: Evt[]; home: Equipe; away: Equipe; live: boolean; clock: string | null }) {
  const lignes = events.reduce<{ e: Evt; sh: number; sa: number; pts: number }[]>((acc, e) => {
    const pts = EVENT_POINTS[e.kind] ?? 0;
    const p = acc[acc.length - 1] ?? { sh: 0, sa: 0 };
    acc.push({ e, pts, sh: p.sh + (e.team_id === home.id ? pts : 0), sa: p.sa + (e.team_id === away.id ? pts : 0) });
    return acc;
  }, []);
  const fin = Math.max(80, ...events.map((e) => e.minute ?? 0));
  const cles = lignes.filter((l) => l.pts > 0 || l.e.kind === "yellow" || l.e.kind === "red");
  const maintenant = live && clock ? parseInt(clock, 10) : null;
  const nom = (t: Equipe) => t.short_name ?? t.name;
  const marque = (domicile: boolean) => cles.filter((l) => (l.e.team_id === home.id) === domicile).map(({ e, sh, sa }) => (
    <span key={e.id} title={`${e.minute ?? "?"}' ${EVENT_LABEL[e.kind] ?? e.kind} (${sh}–${sa})`}
      className="absolute -translate-x-1/2 text-lg leading-none" style={{ left: `${Math.min(100, ((e.minute ?? 0) / fin) * 100)}%` }}>{PICTO[e.kind]}</span>
  ));

  return (
    <section aria-labelledby="h-faits" className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="h-faits" className="groovy text-2xl text-vin">Le fil du match</h2>
        {live && <p className="inline-flex items-center gap-2 rounded-full bg-alerte text-white px-3 py-1 text-sm font-bold tnum"><span className="pastille" aria-hidden />{clock ?? "En direct"}</p>}
      </div>

      {/* la frise */}
      <div className="rounded-2xl bg-bordeaux text-white px-4 pt-4 pb-3" aria-hidden>
        <p className="text-xs font-semibold text-white/70">{nom(home)}</p>
        <div className="relative h-7 mt-1">{marque(true)}</div>
        <div className="relative h-2 rounded-full bg-white/15">
          <span className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
          {maintenant != null && <span className="absolute inset-y-0 left-0 rounded-full bg-moutarde" style={{ width: `${Math.min(100, (maintenant / fin) * 100)}%` }} />}
        </div>
        <div className="relative h-7 mt-1">{marque(false)}</div>
        <div className="flex justify-between text-xs text-white/70 tnum"><span>{nom(away)}</span><span>0&apos; · mi-temps · {fin}&apos;</span></div>
      </div>

      {/* le récit */}
      <ol className="mt-4 grid gap-1.5">
        {[...lignes].reverse().map(({ e, sh, sa, pts }) => {
          const domicile = e.team_id === home.id;
          const p = e.player as { slug: string; first_name: string; last_name: string } | null;
          return (
            <li key={e.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 border-l-4 ${domicile ? "border-vin" : "border-moutarde"} ${pts ? "bg-surface font-semibold" : "bg-teinte/50 text-sm"}`}>
              <span className="titre tnum font-extrabold w-9 shrink-0 text-vin">{e.minute != null ? `${e.minute}'` : ""}</span>
              <span aria-hidden>{PICTO[e.kind] ?? "•"}</span>
              <span className="min-w-0 flex-1">
                {EVENT_LABEL[e.kind] ?? e.kind}
                {p && <> · <Link href={`/joueurs/${p.slug}`} className="underline underline-offset-2">{p.first_name} {p.last_name}</Link></>}
                {e.text && <span className="text-sourdine font-normal"> · {e.text}</span>}
                <span className="text-sourdine font-normal"> ({nom(domicile ? home : away)})</span>
              </span>
              {pts > 0 && <span className="titre tnum font-extrabold shrink-0">{sh}–{sa}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
