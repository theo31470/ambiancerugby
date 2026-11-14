"use client";
import { useEffect, useRef, useState } from "react";
import { Ballon } from "./Icones";

const REPERES = [
  { p: 0.22, nom: "Ligne des 22" },
  { p: 0.5, nom: "Milieu de terrain" },
  { p: 0.78, nom: "Dans les 22 adverses" },
];

/** Barre de lecture : le ballon remonte le terrain à mesure qu'on lit, jusqu'à l'essai. */
export default function TerrainLecture({ cible }: { cible: string }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const calc = () => {
      const el = document.getElementById(cible);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const fait = -r.top + window.innerHeight * 0.25;
      setP(Math.max(0, Math.min(1, total > 0 ? fait / total : 1)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(calc);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [cible]);

  const essai = p >= 0.995;
  const repere = [...REPERES].reverse().find((r) => p >= r.p)?.nom ?? "Coup d'envoi";

  return (
    <div className={`fixed inset-x-0 z-30 transition-transform duration-500 ${p > 0.02 ? "translate-y-0" : "translate-y-[calc(100%+var(--barre-onglets))]"}`} style={{ bottom: "var(--barre-onglets)" }} aria-hidden>
      <div className="terrain-lecture relative h-9 border-t-2 border-white/70">
        {/* lignes */}
        <span className="absolute inset-y-0 left-[4%] w-0.5 bg-white/80" />
        {REPERES.map((r) => <span key={r.p} className={`absolute inset-y-0 w-0.5 ${r.p === 0.5 ? "bg-white/80" : "bg-white/50"}`} style={{ left: `${4 + r.p * 92}%` }} />)}
        <span className="absolute inset-y-0 right-[4%] w-0.5 bg-white/80" />
        <span className={`absolute inset-y-0 right-0 w-[4%] ${essai ? "bg-moutarde" : "bg-white/10"} transition-colors`} />
        {/* ballon */}
        <span className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-150" style={{ left: `calc(${4 + p * 92}% - 14px)` }}>
          <Ballon className="w-7 text-moutarde [--deco-trait:var(--pelouse)]" />
        </span>
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white drop-shadow ${essai ? "groovy text-base text-moutarde" : ""}`}>
          {essai ? "Essai ! Article terminé" : repere}
        </span>
      </div>
    </div>
  );
}
