"use client";
import { useState } from "react";

/**
 * Score du tableau d'affichage. En direct, le chiffre qui change est remonté (nouvelle clé) :
 * il saute et s'illumine en moutarde. Le score d'arrivée sur la page ne bouge pas.
 */
export default function ScoreAnime({ dom, ext, live }: { dom: number; ext: number; live: boolean }) {
  const [depart] = useState({ d: dom, e: ext });
  const chiffre = (v: number, k: "d" | "e") => (
    <span key={`${k}-${v}`} className={`inline-block rounded-xl px-1 ${live && v !== depart[k] ? "score-saut" : ""}`}>{v}</span>
  );
  return (
    <p className={`titre tnum font-extrabold text-6xl sm:text-8xl leading-none ${live ? "text-moutarde" : ""}`} aria-live={live ? "polite" : undefined}>
      {chiffre(dom, "d")}<span className="text-white/35 mx-2 sm:mx-4" aria-hidden>–</span><span className="sr-only"> à </span>{chiffre(ext, "e")}
    </p>
  );
}
