"use client";
import { useEffect, useId, useRef, useState } from "react";

export type Onglet = { id: string; label: string; badge?: string | number | null; contenu: React.ReactNode };

/**
 * Onglets de la fiche match : l'onglet ouvert suit l'adresse (#joueurs…) pour pouvoir être partagé,
 * flèches du clavier pour passer d'un onglet à l'autre, barre d'onglets collée en haut au défilement.
 */
export default function Onglets({ onglets, initial }: { onglets: Onglet[]; initial?: string }) {
  const visibles = onglets.filter((o) => o.contenu);
  const [actif, setActif] = useState(initial && visibles.some((o) => o.id === initial) ? initial : visibles[0]?.id);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const ouvrir = (id: string, focus = false) => {
    setActif(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) refs.current[id]?.focus();
  };
  const clavier = (e: React.KeyboardEvent, i: number) => {
    const n = visibles.length;
    const cible = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (cible >= 0) { e.preventDefault(); ouvrir(visibles[cible].id, true); }
  };

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-fond/95 backdrop-blur border-b border-trait">
        <div role="tablist" aria-label="Sections du match" className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {visibles.map((o, i) => (
            <button key={o.id} ref={(el) => { refs.current[o.id] = el; }} role="tab" type="button" id={`${base}-t-${o.id}`}
              aria-selected={actif === o.id} aria-controls={`${base}-p-${o.id}`} tabIndex={actif === o.id ? 0 : -1}
              onClick={() => ouvrir(o.id)} onKeyDown={(e) => clavier(e, i)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${actif === o.id ? "bg-bordeaux text-white" : "text-encre hover:bg-teinte"}`}>
              {o.label}
              {o.badge != null && o.badge !== "" && <span className={`ml-1.5 rounded-full px-1.5 text-xs tnum ${actif === o.id ? "bg-moutarde text-bordeaux" : "bg-teinte"}`}>{o.badge}</span>}
            </button>
          ))}
        </div>
      </div>
      {visibles.map((o) => (
        <div key={o.id} role="tabpanel" id={`${base}-p-${o.id}`} aria-labelledby={`${base}-t-${o.id}`} hidden={actif !== o.id}
          className={actif === o.id ? "onglet-entree pt-6" : undefined} tabIndex={0}>
          {o.contenu}
        </div>
      ))}
    </div>
  );
}
