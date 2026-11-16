"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type Onglet = { id: string; label: string; badge?: string | number | null; contenu: React.ReactNode };

/**
 * Onglets de la fiche match, façon app :
 * - l'onglet ouvert suit l'adresse (#joueurs…) pour pouvoir être partagé ;
 * - on passe d'un onglet à l'autre en glissant le doigt sur le contenu, ou avec les flèches du clavier ;
 * - un repère glisse sous l'onglet actif ;
 * - la barre reste collée en haut et, quand le tableau du score sort de l'écran, elle affiche le score en version compacte.
 */
export default function Onglets({ onglets, initial, score }: { onglets: Onglet[]; initial?: string; score?: React.ReactNode }) {
  const visibles = onglets.filter((o) => o.contenu);
  const [actif, setActif] = useState(initial && visibles.some((o) => o.id === initial) ? initial : visibles[0]?.id);
  const [sens, setSens] = useState<"g" | "d" | null>(null);
  const [compact, setCompact] = useState(false);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const liste = useRef<HTMLDivElement>(null);
  const [repere, setRepere] = useState<{ x: number; l: number } | null>(null);
  const idx = Math.max(0, visibles.findIndex((o) => o.id === actif));

  useEffect(() => {
    const lireHash = () => {
      const h = window.location.hash.slice(1);
      if (visibles.some((o) => o.id === h)) setActif(h);
    };
    lireHash();
    window.addEventListener("hashchange", lireHash);
    return () => window.removeEventListener("hashchange", lireHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // le repère sous l'onglet actif, et l'onglet ramené dans la zone visible
  useLayoutEffect(() => {
    const b = actif ? refs.current[actif] : null;
    if (!b) return;
    setRepere({ x: b.offsetLeft, l: b.offsetWidth });
    const l = liste.current;
    if (l) l.scrollTo({ left: b.offsetLeft - (l.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
  }, [actif]);

  // score compact quand le grand tableau n'est plus visible
  useEffect(() => {
    const hero = document.querySelector("[data-score-hero]");
    if (!hero || !score) return;
    const obs = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    obs.observe(hero);
    return () => obs.disconnect();
  }, [score]);

  const ouvrir = (id: string, focus = false) => {
    const nouveau = visibles.findIndex((o) => o.id === id);
    setSens(nouveau > idx ? "d" : nouveau < idx ? "g" : null);
    setActif(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) refs.current[id]?.focus();
  };
  const clavier = (e: React.KeyboardEvent, i: number) => {
    const n = visibles.length;
    const cible = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (cible >= 0) { e.preventDefault(); ouvrir(visibles[cible].id, true); }
  };

  // glisser le doigt sur le contenu pour changer d'onglet
  const doigt = useRef<{ x: number; y: number; t: number } | null>(null);
  const debut = (e: React.TouchEvent) => {
    const t = e.touches[0];
    // pas depuis le bord gauche (geste de retour), ni dans une zone qui défile déjà à l'horizontale
    if (t.clientX < 28 || (e.target as Element).closest(".defile-scroll, [class*='overflow-x-auto'], input, [data-sans-glisse]")) { doigt.current = null; return; }
    doigt.current = { x: t.clientX, y: t.clientY, t: e.timeStamp };
  };
  const fin = (e: React.TouchEvent) => {
    const d = doigt.current;
    doigt.current = null;
    if (!d) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - d.x, dy = t.clientY - d.y;
    const rapide = Math.abs(dx) / Math.max(1, e.timeStamp - d.t) > 0.45;
    if (Math.abs(dx) < (rapide ? 45 : 80) || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const cible = dx < 0 ? idx + 1 : idx - 1;
    if (cible < 0 || cible >= visibles.length) return;
    try { navigator.vibrate?.(5); } catch { /* */ }
    ouvrir(visibles[cible].id);
  };

  return (
    <div className="mt-8">
      <div className="onglets-match sticky top-[env(safe-area-inset-top)] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-fond border-b border-trait">
        {score && (
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${compact ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!compact}>
            <div className="overflow-hidden">{score}</div>
          </div>
        )}
        <div ref={liste} role="tablist" aria-label="Sections du match" className="relative flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {repere && <span aria-hidden className="absolute top-2 bottom-2 rounded-full bg-bordeaux transition-[left,width] duration-300 ease-[cubic-bezier(.3,1.25,.5,1)]" style={{ left: repere.x, width: repere.l }} />}
          {visibles.map((o, i) => (
            <button key={o.id} ref={(el) => { refs.current[o.id] = el; }} role="tab" type="button" id={`${base}-t-${o.id}`}
              aria-selected={actif === o.id} aria-controls={`${base}-p-${o.id}`} tabIndex={actif === o.id ? 0 : -1}
              onClick={() => ouvrir(o.id)} onKeyDown={(e) => clavier(e, i)}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${actif === o.id ? "text-white" : "text-encre hover:bg-teinte"} ${!repere && actif === o.id ? "bg-bordeaux" : ""}`}>
              {o.label}
              {o.badge != null && o.badge !== "" && <span className={`ml-1.5 rounded-full px-1.5 text-xs tnum ${actif === o.id ? "bg-moutarde text-bordeaux" : "bg-teinte"}`}>{o.badge}</span>}
            </button>
          ))}
        </div>
        {visibles.length > 1 && (
          <div aria-hidden className="lg:hidden flex justify-center gap-1 pb-1.5 -mt-0.5">
            {visibles.map((o, i) => <span key={o.id} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? "w-4 bg-vin" : "w-1 bg-trait"}`} />)}
          </div>
        )}
      </div>
      <div onTouchStart={debut} onTouchEnd={fin} className="overflow-x-clip">
        {visibles.map((o) => (
          <div key={o.id} role="tabpanel" id={`${base}-p-${o.id}`} aria-labelledby={`${base}-t-${o.id}`} hidden={actif !== o.id}
            className={actif === o.id ? `pt-6 ${sens === "d" ? "onglet-depuis-droite" : sens === "g" ? "onglet-depuis-gauche" : "onglet-entree"}` : undefined} tabIndex={0}>
            {o.contenu}
          </div>
        ))}
      </div>
    </div>
  );
}
