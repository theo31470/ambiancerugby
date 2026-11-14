"use client";
import { useEffect, useState } from "react";

/**
 * Score du tableau d'affichage. Match terminé : les chiffres montent depuis zéro à l'arrivée sur la page.
 * En direct : le chiffre qui change est remonté (nouvelle clé), il saute et s'illumine en moutarde.
 */
export default function ScoreAnime({ dom, ext, live, compter }: { dom: number; ext: number; live: boolean; compter: boolean }) {
  const [compte, setCompte] = useState<{ d: number; e: number } | null>(compter ? { d: 0, e: 0 } : null);
  // score à l'arrivée sur la page : seuls les chiffres qui changent ensuite sautent
  const [depart] = useState({ d: dom, e: ext });

  useEffect(() => {
    if (!compter) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const debut = performance.now(), duree = reduit ? 1 : 900;
    let raf = 0;
    const pas = (t: number) => {
      const k = Math.min(1, (t - debut) / duree), f = 1 - Math.pow(1 - k, 3);
      setCompte(k >= 1 ? null : { d: Math.round(dom * f), e: Math.round(ext * f) });
      if (k < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = compte?.d ?? dom, e = compte?.e ?? ext;
  const chiffre = (v: number, k: "d" | "e") => (
    <span key={`${k}-${v}`} className={`inline-block rounded-xl px-1 ${live && v !== depart[k] ? "score-saut" : ""}`}>{v}</span>
  );
  return (
    <p className={`titre tnum font-extrabold text-6xl sm:text-8xl leading-none ${live ? "text-moutarde" : ""}`} aria-live={live ? "polite" : undefined}>
      {chiffre(d, "d")}<span className="text-white/35 mx-2 sm:mx-4" aria-hidden>–</span><span className="sr-only"> à </span>{chiffre(e, "e")}
    </p>
  );
}
