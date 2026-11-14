"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type JoueurCompo = {
  numero: number; prenom: string; nom: string; slug: string | null; photo: string | null;
  note?: number | null; capitaine?: boolean; entre?: boolean; infos?: string[];
};
export type EquipeCompo = { nom: string; titulaires: JoueurCompo[]; remplacants: JoueurCompo[] };

const POSTE: Record<number, string> = {
  1: "Pilier gauche", 2: "Talonneur", 3: "Pilier droit", 4: "2e ligne", 5: "2e ligne", 6: "3e ligne aile", 7: "3e ligne aile", 8: "3e ligne centre",
  9: "Demi de mêlée", 10: "Demi d'ouverture", 11: "Ailier gauche", 12: "Premier centre", 13: "Second centre", 14: "Ailier droit", 15: "Arrière",
  16: "Talonneur", 17: "Pilier", 18: "Pilier", 19: "2e ligne", 20: "3e ligne", 21: "Demi de mêlée",
};
// placement sur le terrain (en %), avants en haut comme sur une feuille de match
const PLACE: Record<number, [number, number]> = {
  1: [24, 9], 2: [50, 9], 3: [76, 9], 4: [38, 23], 5: [62, 23], 6: [20, 37], 8: [50, 37], 7: [80, 37],
  9: [38, 52], 10: [62, 52], 11: [13, 66], 12: [37, 70], 13: [63, 70], 14: [87, 66], 15: [50, 85],
};
const initiales = (j: JoueurCompo) => `${j.prenom.slice(0, 1)}${j.nom.slice(0, 1)}`;

/**
 * Le XV de départ sur un terrain aux couleurs d'Ambiance Rugby : chaque joueur à son poste, sa fiche au survol
 * (ou au toucher), les remplaçants à côté. Deux équipes : on passe de l'une à l'autre.
 */
export default function TerrainCompo({ equipes, titre, source }: { equipes: [EquipeCompo, EquipeCompo]; titre?: string; source?: string }) {
  const [cote, setCote] = useState(0);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [vu, setVu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const eq = equipes[cote];
  const parNum = new Map(eq.titulaires.map((j) => [j.numero, j]));

  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        {titre && <h2 className="groovy text-2xl text-vin">{titre}</h2>}
        <div role="tablist" aria-label="Équipe" className="flex rounded-full bg-teinte p-1 text-sm font-semibold">
          {equipes.map((e, i) => (
            <button key={e.nom} role="tab" type="button" aria-selected={cote === i} onClick={() => { setCote(i); setOuvert(null); }}
              className={`rounded-full px-4 py-1.5 max-w-44 truncate transition-colors ${cote === i ? "bg-bordeaux text-white" : "text-sourdine hover:text-encre"}`}>{e.nom}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,34rem)_1fr] items-start">
        {/* le terrain */}
        <div key={cote} className="relative w-full aspect-[3/4] sm:aspect-[4/5]">
          <div aria-hidden className="absolute inset-0 rounded-2xl overflow-hidden bg-[linear-gradient(180deg,var(--vin),var(--bordeaux))]">
            <div className="absolute inset-0 opacity-[.07] bg-[repeating-linear-gradient(180deg,#fff_0_10%,transparent_10%_20%)]" />
            <img src="/logo-blanc.png" alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/5 opacity-[.1] pointer-events-none" />
          </div>
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-white/25 pointer-events-none">
            <line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" strokeWidth=".5" />
            <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth=".3" strokeDasharray="1.5 1.5" />
            <line x1="0" y1="45" x2="100" y2="45" stroke="currentColor" strokeWidth=".4" />
            <line x1="0" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth=".3" strokeDasharray="1.5 1.5" />
            <line x1="0" y1="77" x2="100" y2="77" stroke="currentColor" strokeWidth=".3" />
          </svg>
          <ol className="absolute inset-0">
            {Object.entries(PLACE).map(([n, [x, y]], i) => {
              const j = parNum.get(Number(n));
              if (!j) return null;
              const num = Number(n);
              const haut = y < 45;
              return (
                <li key={n} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%`, zIndex: ouvert === num ? 30 : 1 }}
                  // la fiche reste ouverte tant que la souris est sur le joueur OU sur sa fiche (pour pouvoir cliquer le lien)
                  onMouseEnter={() => setOuvert(num)} onMouseLeave={() => setOuvert((o) => (o === num ? null : o))}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOuvert((o) => (o === num ? null : o)); }}>
                  <button type="button" onClick={() => setOuvert(ouvert === num ? null : num)} onFocus={() => setOuvert(num)} aria-expanded={ouvert === num}
                    className={`group flex flex-col items-center gap-1 text-white transition-all duration-500 ease-out ${vu ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-90"}`}
                    style={{ transitionDelay: `${i * 45}ms` }}>
                    <span className={`relative w-10 h-10 sm:w-14 sm:h-14 rounded-full ring-2 overflow-hidden bg-white/15 grid place-items-center transition-transform group-hover:scale-110 ${ouvert === num ? "ring-moutarde scale-110" : "ring-white/80"}`}>
                      {j.photo ? <img src={j.photo} alt="" className="w-full h-full object-cover object-top" loading="lazy" /> : <span className="titre font-extrabold text-sm sm:text-base">{initiales(j)}</span>}
                    </span>
                    {j.capitaine && <span className="absolute -top-1 -right-2 rounded-full bg-moutarde text-bordeaux text-[9px] font-extrabold px-1">CAP</span>}
                    <span className="text-[10px] sm:text-xs font-bold leading-tight text-center whitespace-nowrap drop-shadow max-w-[5.5rem] sm:max-w-28 truncate">
                      <span className="text-moutarde tnum">{num}.</span> {j.nom.toUpperCase()}
                    </span>
                  </button>
                  {ouvert === num && (
                    <div role="tooltip" className={`absolute left-1/2 -translate-x-1/2 w-52 fiche-joueur ${haut ? "top-full pt-1.5" : "bottom-full pb-1.5"}`}>
                      <div className="rounded-xl bg-surface text-encre shadow-xl border border-trait p-3 text-left">
                      <p className="text-xs text-sourdine">{num}. {POSTE[num]}</p>
                      <p className="titre font-bold leading-tight">{j.prenom} {j.nom}</p>
                      {j.note != null && <p className="mt-1 text-sm"><span className="rounded-full bg-moutarde text-bordeaux titre font-extrabold px-2 py-0.5 tnum">{j.note.toFixed(1)}</span></p>}
                      {j.infos?.map((t) => <p key={t} className="text-xs text-sourdine mt-1">{t}</p>)}
                      {j.slug && <Link href={`/joueurs/${j.slug}`} className="mt-2 inline-block text-xs font-semibold text-vin underline underline-offset-2">Voir sa fiche</Link>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* les remplaçants */}
        <div className="bg-surface border border-trait rounded-2xl p-4">
          <p className="titre font-bold text-vin mb-2">Remplaçants</p>
          {eq.remplacants.length ? (
            <ol className="grid gap-1.5 text-sm">
              {eq.remplacants.map((j) => (
                <li key={j.numero} className={`flex items-baseline gap-2 ${j.entre === false ? "text-sourdine" : ""}`}>
                  <span className="tnum font-bold text-vin w-6 shrink-0">{j.numero}.</span>
                  {j.slug ? <Link href={`/joueurs/${j.slug}`} className="font-semibold hover:text-vin truncate">{j.prenom.slice(0, 1)}. {j.nom}</Link> : <span className="font-semibold truncate">{j.prenom.slice(0, 1)}. {j.nom}</span>}
                  {j.note != null && <span className="ml-auto text-xs tnum">{j.note.toFixed(1)}</span>}
                  {j.entre && <span className="text-xs" title="Entré en jeu">🔁</span>}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-sourdine">Pas encore annoncés.</p>}
          {source && <p className="mt-4 text-xs text-sourdine">{source}</p>}
        </div>
      </div>
    </div>
  );
}
