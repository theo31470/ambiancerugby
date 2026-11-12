"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ActionTerrain, Cote } from "@/lib/terrain";

type Equipe = { name: string; short_name: string | null };
const VUES = [
  { id: "territoire", label: "Territoire" },
  { id: "phases", label: "Phases arrêtées" },
  { id: "pied", label: "Jeu au pied" },
  { id: "essais", label: "Essais" },
] as const;
type Vue = (typeof VUES)[number]["id"];

const COUL: Record<Cote, string> = { h: "var(--vin)", a: "var(--moutarde)" };
const L = 100, LA = 70, EB = 10; // longueur, largeur, profondeur d'en-but (mètres)
const AVEC_BALLON = new Set(["ball_recycled", "ball_kicked", "tap_and_go", "kick_to_touch"]);

/**
 * La carte du terrain : où chaque équipe a joué, ses phases arrêtées, son jeu au pied et ses essais,
 * d'après le fil positionné du match. L'équipe qui reçoit attaque vers la droite.
 */
export default function CarteTerrain({ actions, home, away, full = true }: { actions: ActionTerrain[]; home: Equipe; away: Equipe; full?: boolean }) {
  const [vue, setVue] = useState<Vue>("territoire");
  const nom = (c: Cote) => (c === "h" ? home.short_name ?? home.name : away.short_name ?? away.name);
  const pos = actions.filter((a) => a.c && a.x != null && a.y != null) as (ActionTerrain & { c: Cote; x: number; y: number })[];

  const stats = useMemo(() => {
    const ballon = pos.filter((a) => AVEC_BALLON.has(a.k));
    const part = (c: Cote) => {
      const l = ballon.filter((a) => a.c === c);
      const adverse = l.filter((a) => (c === "h" ? a.x > 50 : a.x < 50)).length;
      const dans22 = l.filter((a) => (c === "h" ? a.x >= 78 : a.x <= 22)).length;
      return { total: l.length, adverse: l.length ? Math.round((100 * adverse) / l.length) : 0, dans22 };
    };
    const compte = (k: string, c: Cote) => actions.filter((a) => a.k === k && a.c === c).length;
    return {
      h: { ...part("h"), pied: compte("ball_kicked", "h"), touches: compte("line_out_won", "h"), melees: compte("scrum_won", "h"), penalites: compte("penalty_awarded", "h"), grattes: compte("turnover", "h") },
      a: { ...part("a"), pied: compte("ball_kicked", "a"), touches: compte("line_out_won", "a"), melees: compte("scrum_won", "a"), penalites: compte("penalty_awarded", "a"), grattes: compte("turnover", "a") },
    };
  }, [actions, pos]);

  // grille 10 m × 10 m : qui a le ballon dans chaque zone
  const cases = useMemo(() => {
    const g = new Map<string, { h: number; a: number }>();
    for (const a of pos) {
      if (!AVEC_BALLON.has(a.k)) continue;
      const cx = Math.min(9, Math.max(0, Math.floor(a.x / 10))), cy = Math.min(6, Math.max(0, Math.floor(a.y / 10)));
      const k = `${cx}-${cy}`;
      const v = g.get(k) ?? { h: 0, a: 0 };
      v[a.c]++;
      g.set(k, v);
    }
    const max = Math.max(1, ...[...g.values()].map((v) => v.h + v.a));
    return [...g.entries()].map(([k, v]) => { const [cx, cy] = k.split("-").map(Number); return { cx, cy, ...v, poids: (v.h + v.a) / max }; });
  }, [pos]);

  // une mêlée appartient à l'équipe qui la gagne (événement suivant « scrum_won »)
  const phases = useMemo(() => {
    const out: { x: number; y: number; c: Cote; type: "melee" | "touche" | "penalite" }[] = [];
    actions.forEach((a, i) => {
      if (a.k === "scrum" && a.x != null && a.y != null) {
        const gagne = actions.slice(i + 1, i + 4).find((b) => b.k === "scrum_won");
        const c = gagne?.c ?? a.c;
        if (c) out.push({ x: a.x, y: a.y, c, type: "melee" });
      }
      if (a.k === "line_out_won" && a.c && a.x != null && a.y != null) out.push({ x: a.x, y: Math.min(LA, Math.max(0, a.y)), c: a.c, type: "touche" });
      if (a.k === "penalty_awarded" && a.c && a.x != null && a.y != null) out.push({ x: a.x, y: a.y, c: a.c, type: "penalite" });
    });
    return out;
  }, [actions]);

  // un essai s'aplatit dans l'en-but ou juste devant la ligne ; transformations et pénalités sont tapées plus loin
  const essais = (() => {
    const l = pos.filter((a) => a.k === "score_change" && (a.c === "h" ? a.x >= 95 : a.x <= 5)).sort((a, b) => a.y - b.y);
    // étiquettes écartées pour ne pas se chevaucher (4,5 m minimum)
    const places: { c: Cote; y: number }[] = [];
    const l2 = l.map((e) => {
      let y = Math.min(LA - 3, Math.max(3, e.y));
      const prec = [...places].reverse().find((p) => p.c === e.c);
      if (prec && y - prec.y < 4.5) y = prec.y + 4.5;
      places.push({ c: e.c, y });
      return { ...e, yEtiquette: y };
    });
    // si la pile déborde en bas du terrain, on la remonte d'un bloc
    for (const c of ["h", "a"] as const) {
      const pile = l2.filter((e) => e.c === c);
      const exces = Math.max(0, ...pile.map((e) => e.yEtiquette)) - (LA - 2.5);
      if (exces > 0) pile.forEach((e) => { e.yEtiquette = Math.max(2.5, e.yEtiquette - exces); });
    }
    return l2;
  })();
  const pieds = pos.filter((a) => a.k === "ball_kicked" || a.k === "kick_to_touch");
  if (pos.length < 30) return null;

  const legende: Record<Vue, string> = {
    territoire: "Chaque case de 10 m prend la couleur de l'équipe qui y avait le ballon (blanc si c'est partagé) ; plus elle est vive, plus le jeu y est passé.",
    phases: "● mêlée gagnée, ▲ touche gagnée, ✕ pénalité obtenue, à l'endroit exact où elles ont eu lieu.",
    pied: "D'où chaque équipe a tapé au pied.",
    essais: "L'endroit où chaque essai a été aplati.",
  };

  return (
    <section aria-labelledby="h-terrain" className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <h2 id="h-terrain" className="groovy text-2xl text-vin">La carte du terrain</h2>
        <p className="text-sm text-sourdine">Où le match s&apos;est joué</p>
      </div>
      <div className="relative bg-surface border border-trait rounded-2xl p-4 overflow-hidden">
        {!full && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface/40 backdrop-blur-[6px] p-4 text-center">
            <p className="max-w-sm font-semibold">La carte du terrain, le territoire et les phases arrêtées sont réservés aux Supporters.
              <Link href="/abonnement" className="block mt-3 bouton-or justify-center">Devenir Supporter</Link></p>
          </div>
        )}
        <div aria-hidden={!full || undefined} className={full ? "" : "select-none"}>
          <div role="tablist" aria-label="Vue de la carte" className="flex flex-wrap gap-1.5 mb-3">
            {VUES.map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={vue === v.id} onClick={() => setVue(v.id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${vue === v.id ? "bg-bordeaux text-white" : "bg-teinte hover:bg-trait"}`}>{v.label}</button>
            ))}
          </div>

          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-[color-mix(in_srgb,var(--moutarde)_70%,var(--encre))]">← {nom("a")} attaque</span>
            <span className="text-vin">{nom("h")} attaque →</span>
          </div>
          <svg viewBox={`${-EB - 2} -3 ${L + 2 * EB + 4} ${LA + 6}`} className="w-full h-auto rounded-xl" role="img"
            aria-label={`${nom("h")} a joué ${stats.h.adverse} % de ses ballons dans le camp adverse, ${nom("a")} ${stats.a.adverse} %.`}>
            {/* pelouse, en-buts et lignes */}
            <rect x={-EB} y={0} width={L + 2 * EB} height={LA} fill="#2f5a3a" />
            {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 10} y={0} width={5} height={LA} fill="#346341" />)}
            <rect x={-EB} y={0} width={EB} height={LA} fill="#294f33" />
            <rect x={L} y={0} width={EB} height={LA} fill="#294f33" />
            <g stroke="#fff" strokeOpacity={0.75} strokeWidth={0.35} fill="none">
              <rect x={-EB} y={0} width={L + 2 * EB} height={LA} />
              {[0, 22, 50, 78, 100].map((x) => <line key={x} x1={x} x2={x} y1={0} y2={LA} />)}
              {[40, 60].map((x) => <line key={x} x1={x} x2={x} y1={0} y2={LA} strokeDasharray="1.5 1.5" />)}
              {[5, 95].map((x) => <line key={x} x1={x} x2={x} y1={0} y2={LA} strokeDasharray="1 2.5" strokeOpacity={0.4} />)}
              {[5, 15, LA - 15, LA - 5].map((y) => <line key={y} x1={0} x2={L} y1={y} y2={y} strokeDasharray="1 3" strokeOpacity={0.35} />)}
            </g>
            {[0, L].map((x) => <g key={x} stroke="#fff" strokeWidth={0.6}><line x1={x} x2={x} y1={LA / 2 - 2.8} y2={LA / 2 + 2.8} /></g>)}

            {vue === "territoire" && cases.map((k) => {
              // couleur franche quand une équipe domine nettement la zone, blanc quand c'est partagé
              const partH = k.h / (k.h + k.a);
              const fill = partH >= 0.6 ? COUL.h : partH <= 0.4 ? COUL.a : "#ffffff";
              return <rect key={`${k.cx}-${k.cy}`} x={k.cx * 10 + 0.5} y={k.cy * 10 + 0.5} width={9} height={9} rx={1.4}
                fill={fill} fillOpacity={0.6 + 0.4 * k.poids} stroke="#fff" strokeOpacity={0.25} strokeWidth={0.2} />;
            })}
            {vue === "phases" && phases.map((p, i) => p.type === "melee"
              ? <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={COUL[p.c]} stroke="#fff" strokeWidth={0.3} />
              : p.type === "touche"
                ? <path key={i} d={`M${p.x},${p.y < LA / 2 ? 0.6 : LA - 0.6} l1.6,${p.y < LA / 2 ? 2.8 : -2.8} l-3.2,0 z`} fill={COUL[p.c]} stroke="#fff" strokeWidth={0.3} />
                : <g key={i} stroke={COUL[p.c]} strokeWidth={0.8}><line x1={p.x - 1.3} x2={p.x + 1.3} y1={p.y - 1.3} y2={p.y + 1.3} /><line x1={p.x - 1.3} x2={p.x + 1.3} y1={p.y + 1.3} y2={p.y - 1.3} /></g>)}
            {vue === "pied" && pieds.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.1} fill={COUL[p.c]} fillOpacity={0.9} stroke="#fff" strokeWidth={0.25} />
            ))}
            {vue === "essais" && essais.map((e, i) => {
              const x = e.c === "h" ? L + EB / 2 : -EB / 2;
              const y = e.yEtiquette;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={1.8} fill={COUL[e.c]} stroke="#fff" strokeWidth={0.4} />
                  <text x={e.c === "h" ? x - 3 : x + 3} y={y + 1} fontSize={2.6} fill="#fff" textAnchor={e.c === "h" ? "end" : "start"} fontWeight={700}>
                    {e.m}&apos; {e.j?.[0]?.split(" ").slice(-1)[0] ?? ""}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="mt-2 text-xs text-sourdine">{legende[vue]}</p>

          <dl className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1.5 text-sm tnum">
            {([
              ["Ballons joués dans le camp adverse", `${stats.h.adverse} %`, `${stats.a.adverse} %`],
              ["Actions dans les 22 m adverses", stats.h.dans22, stats.a.dans22],
              ["Coups de pied", stats.h.pied, stats.a.pied],
              ["Touches gagnées", stats.h.touches, stats.a.touches],
              ["Mêlées gagnées", stats.h.melees, stats.a.melees],
              ["Pénalités obtenues", stats.h.penalites, stats.a.penalites],
              ["Ballons récupérés", stats.h.grattes, stats.a.grattes],
            ] as [string, string | number, string | number][]).map(([l, h, a]) => (
              <div key={l} className="contents">
                <dd className="text-right font-bold text-vin">{h}</dd>
                <dt className="text-center text-sourdine">{l}</dt>
                <dd className="font-bold text-[color-mix(in_srgb,var(--moutarde)_70%,var(--encre))]">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
