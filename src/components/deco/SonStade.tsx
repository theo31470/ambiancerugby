"use client";
import { useEffect, useState } from "react";
import { arreterTribune, clameur, demarrerTribune, setSonActif, sifflet, sonActif } from "@/lib/son";

/** Bouton « Son du stade » : rumeur de tribune, sifflet, clameur sur les essais. */
export default function SonStade({ variante = "entete" }: { variante?: "entete" | "menu" }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // l'état mémorisé est relu après le montage (le navigateur n'autorise le son qu'après un geste)
    const actif = sonActif();
    const sync = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener("ar:son", sync);
    let depart: (() => void) | null = null;
    if (actif) {
      queueMicrotask(() => setOn(true));
      depart = () => { if (sonActif()) demarrerTribune(); };
      window.addEventListener("pointerdown", depart, { once: true });
    }
    const essai = () => { if (sonActif()) clameur(); };
    window.addEventListener("ar:essai", essai);
    return () => {
      window.removeEventListener("ar:son", sync);
      window.removeEventListener("ar:essai", essai);
      if (depart) window.removeEventListener("pointerdown", depart);
    };
  }, []);

  const basculer = () => {
    const v = !on;
    setSonActif(v);
    setOn(v);
    if (v) {
      sifflet();
      demarrerTribune();
    } else arreterTribune();
  };

  const icone = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" className="animate-pulse" />
          <path d="M19 5a10 10 0 0 1 0 14" className="animate-pulse" />
        </>
      ) : (
        <path d="m22 9-6 6M16 9l6 6" />
      )}
    </svg>
  );

  if (variante === "menu") {
    return (
      <button onClick={basculer} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold ${on ? "bg-moutarde text-bordeaux" : "bg-white/10 text-white"}`}>
        {icone}
        {on ? "Son du stade activé" : "Activer le son du stade"}
      </button>
    );
  }
  return (
    <button onClick={basculer} aria-pressed={on} title={on ? "Couper le son du stade" : "Activer le son du stade"}
      className={`relative w-10 h-10 grid place-items-center rounded-full ${on ? "bg-moutarde text-bordeaux" : "hover:bg-white/10"}`}>
      {icone}
      <span className="sr-only">{on ? "Couper le son du stade" : "Activer le son du stade"}</span>
    </button>
  );
}
