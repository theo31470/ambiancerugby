"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Barre d'onglets du bas, façon app (téléphones et tablettes, cachée sur ordinateur).
 * Accueil · Matchs · Pronos · Clubs · Moi. Toucher l'onglet déjà ouvert remonte en haut de la page.
 */

type Onglet = { href: string; label: string; actif: (p: string) => boolean; icone: (on: boolean) => ReactNode };

const sous = (p: string, ...bases: string[]) => bases.some((b) => p === b || p.startsWith(b + "/"));

const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ONGLETS: Onglet[] = [
  {
    href: "/",
    label: "Accueil",
    actif: (p) => p === "/" || sous(p, "/actus"),
    icone: (on) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
        <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z" {...trait} fill={on ? "currentColor" : "none"} />
        {on && <path d="M9.5 21v-6h5v6" fill="var(--bordeaux)" stroke="var(--bordeaux)" strokeWidth={1} />}
      </svg>
    ),
  },
  {
    href: "/matchs",
    label: "Matchs",
    actif: (p) => sous(p, "/matchs", "/competitions"),
    icone: (on) => (
      // tableau d'affichage
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
        <rect x="2.5" y="5" width="19" height="13" rx="2.5" {...trait} fill={on ? "currentColor" : "none"} />
        <path d="M12 7.5v8" {...trait} stroke={on ? "var(--bordeaux)" : "currentColor"} strokeDasharray="1.5 2" />
        <path d="M6 10.5h2.5v4M15.5 10.5H18v4h-2.5" {...trait} stroke={on ? "var(--bordeaux)" : "currentColor"} strokeWidth={1.8} />
        <path d="M8 21h8" {...trait} />
      </svg>
    ),
  },
  {
    href: "/pronos",
    label: "Pronos",
    actif: (p) => sous(p, "/pronos"),
    icone: (on) => (
      // ballon de rugby
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
        <g transform="rotate(-35 12 12)">
          <ellipse cx="12" cy="12" rx="9.5" ry="6" {...trait} fill={on ? "currentColor" : "none"} />
          <path d="M8 9.2v5.6M16 9.2v5.6M9.5 12h5" {...trait} stroke={on ? "var(--bordeaux)" : "currentColor"} strokeWidth={1.7} />
        </g>
      </svg>
    ),
  },
  {
    href: "/clubs",
    label: "Clubs",
    actif: (p) => sous(p, "/clubs", "/joueurs", "/indice"),
    icone: (on) => (
      // écusson
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
        <path d="M12 2.8 4.5 5.5v6c0 4.6 3.1 8 7.5 9.7 4.4-1.7 7.5-5.1 7.5-9.7v-6Z" {...trait} fill={on ? "currentColor" : "none"} />
        <path d="M8.5 10.5h7M12 7.5v10" {...trait} stroke={on ? "var(--bordeaux)" : "currentColor"} strokeWidth={1.8} />
      </svg>
    ),
  },
];

const MOI = (p: string) => sous(p, "/moi", "/compte", "/boutique", "/abonnement", "/connexion", "/inscription", "/mot-de-passe-oublie", "/membres", "/suivi");

export default function BarreOnglets({ initiale, supporter, nonLues }: { initiale: string | null; supporter: boolean; nonLues: number }) {
  const path = usePathname() ?? "/";
  const index = ONGLETS.findIndex((o) => o.actif(path));
  const actif = index >= 0 ? index : MOI(path) ? 4 : -1;

  const toucher = (i: number) => (e: React.MouseEvent) => {
    try { navigator.vibrate?.(6); } catch { /* pas de vibreur */ }
    // onglet déjà ouvert sur sa page d'accueil : on remonte en haut, comme dans une app
    const cible = i === 4 ? "/moi" : ONGLETS[i].href;
    if (path === cible) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const element = (i: number, href: string, label: string, icone: ReactNode, extra?: ReactNode) => {
    const on = i === actif;
    return (
      <li key={href} className="flex-1">
        <Link href={href} onClick={toucher(i)} aria-current={on ? "page" : undefined}
          className={`onglet relative flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-semibold tracking-tight ${on ? "text-moutarde" : "text-white/65"}`}>
          <span className="onglet-icone relative" data-on={on ? "" : undefined}>
            {icone}
            {extra}
          </span>
          <span>{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Navigation principale" className="barre-onglets lg:hidden fixed inset-x-0 bottom-0 z-40 bg-bordeaux/95 backdrop-blur-md text-white border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* repère doré qui glisse sous l'onglet actif */}
      {actif >= 0 && (
        <span aria-hidden className="absolute top-0 h-[3px] w-[12%] rounded-b-full bg-moutarde transition-[left] duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
          style={{ left: `calc(${actif * 20 + 10}% - 6%)` }} />
      )}
      <ul className="flex max-w-xl mx-auto">
        {ONGLETS.map((o, i) => element(i, o.href, o.label, o.icone(i === actif)))}
        {element(
          4,
          "/moi",
          "Moi",
          initiale ? (
            <span className={`w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold leading-none ${supporter ? "bg-moutarde text-bordeaux" : actif === 4 ? "bg-moutarde text-bordeaux" : "bg-white/20 text-white"} ${actif === 4 ? "ring-2 ring-moutarde ring-offset-2 ring-offset-bordeaux" : ""}`}>
              {initiale}
            </span>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
              <circle cx="12" cy="8.5" r="4" {...trait} fill={actif === 4 ? "currentColor" : "none"} />
              <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...trait} />
            </svg>
          ),
          nonLues > 0 ? (
            <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-moutarde text-bordeaux text-[10px] font-bold grid place-items-center tnum ring-2 ring-bordeaux">
              {nonLues > 9 ? "9+" : nonLues}
            </span>
          ) : null,
        )}
      </ul>
    </nav>
  );
}
