"use client";
import { useEffect, useRef, useState } from "react";

export type LigneChiffre = { label: string; h: number; a: number; suffixe?: string; moinsMieux?: boolean };

/**
 * Le match en chiffres : une ligne par stat, la valeur de chaque équipe et une barre partagée depuis le centre.
 * L'équipe qui domine la stat est mise en couleur. Les barres se remplissent quand le bloc arrive à l'écran.
 */
export default function ChiffresEquipes({ lignes, dom, ext, couleurs }: { lignes: LigneChiffre[]; dom: string; ext: string; couleurs: [string, string] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const visibles = lignes.filter((l) => l.h + l.a > 0);
  if (!visibles.length) return null;

  return (
    <div ref={ref} className="bg-surface border border-trait rounded-2xl p-4 sm:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] text-sm font-bold mb-4">
        <span className="truncate" style={{ color: couleurs[0] }}>{dom}</span>
        <span />
        <span className="truncate text-right" style={{ color: couleurs[1] }}>{ext}</span>
      </div>
      <ul className="grid gap-4">
        {visibles.map((l, i) => {
          const tot = l.h + l.a;
          const ph = tot ? l.h / tot : 0.5;
          const gagneH = l.moinsMieux ? l.h < l.a : l.h > l.a;
          const gagneA = l.moinsMieux ? l.a < l.h : l.a > l.h;
          return (
            <li key={l.label}>
              <div className="grid grid-cols-[4rem_1fr_4rem] items-baseline text-sm tnum">
                <span className={`titre text-lg ${gagneH ? "font-extrabold" : "text-sourdine font-semibold"}`}>{l.h}{l.suffixe ?? ""}</span>
                <span className="text-center text-sourdine">{l.label}</span>
                <span className={`titre text-lg text-right ${gagneA ? "font-extrabold" : "text-sourdine font-semibold"}`}>{l.a}{l.suffixe ?? ""}</span>
              </div>
              <div className="mt-1.5 flex h-2 gap-1" aria-hidden>
                <div className="flex-1 flex justify-end rounded-full bg-teinte overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: vu ? `${ph * 100}%` : "0%", background: gagneH ? couleurs[0] : "var(--trait)", transitionDelay: `${i * 60}ms` }} />
                </div>
                <div className="flex-1 rounded-full bg-teinte overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: vu ? `${(1 - ph) * 100}%` : "0%", background: gagneA ? couleurs[1] : "var(--trait)", transitionDelay: `${i * 60}ms` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
