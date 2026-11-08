"use client";
import { useEffect, useRef, useState } from "react";
import { Ballon, Poteaux } from "./Icones";
import { clameur, sonActif } from "@/lib/son";

const CLE = "ar-drops";
const REUSSI = ["Entre les perches !", "Drop réussi, la tribune se lève !", "Trois points, quel pied !", "Plein centre !"];
const RATE = ["Sur le poteau…", "À côté, la tribune siffle.", "Trop court, contré !", "Ça part dans les tribunes !"];

/** Mini-jeu : tente le drop. Le ballon décrit une parabole vers les poteaux. */
export default function TenteLeDrop() {
  const ballon = useRef<HTMLSpanElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [vol, setVol] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CLE) ?? "null");
      if (s && typeof s.ok === "number") queueMicrotask(() => setScore(s));
    } catch { /* rien de mémorisé */ }
  }, []);

  const tirer = () => {
    if (vol || !ballon.current || !zone.current) return;
    setVol(true);
    setMsg(null);
    const reussi = Math.random() < 0.62;
    const w = zone.current.clientWidth;
    const dx = w - 120;
    // trajectoire : réussie = au-dessus de la barre entre les perches ; ratée = à côté, trop court ou sur le poteau
    const rate = Math.floor(Math.random() * 3);
    const fin = reussi ? { x: dx, y: -78 } : rate === 0 ? { x: dx - 8, y: -42 } : rate === 1 ? { x: dx * 0.7, y: 0 } : { x: dx + 40, y: -90 };
    const sommet = { x: fin.x / 2, y: reussi ? -150 : rate === 1 ? -80 : -140 };
    const anim = ballon.current.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: `translate(${sommet.x}px, ${sommet.y}px) rotate(400deg)`, offset: 0.5 },
        { transform: `translate(${fin.x}px, ${fin.y}px) rotate(760deg)` },
      ],
      { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1100, easing: "cubic-bezier(.2,.5,.6,1)", fill: "forwards" },
    );
    anim.onfinish = () => {
      const next = { ok: score.ok + (reussi ? 1 : 0), total: score.total + 1 };
      setScore(next);
      try { localStorage.setItem(CLE, JSON.stringify(next)); } catch { /* pas de stockage */ }
      const liste = reussi ? REUSSI : RATE;
      setMsg({ t: liste[Math.floor(Math.random() * liste.length)], ok: reussi });
      if (reussi && sonActif()) clameur(0.6);
      setTimeout(() => {
        anim.cancel();
        setVol(false);
      }, 900);
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-wrap items-end gap-4 sm:gap-8">
        <div className="min-w-48">
          <p className="groovy text-2xl text-white">Tente le drop</p>
          <p className="text-sm text-white/70 tnum">
            {score.total ? `${score.ok} réussi${score.ok > 1 ? "s" : ""} sur ${score.total}` : "Avant de partir, un petit coup de pied ?"}
          </p>
          <button onClick={tirer} disabled={vol} className="bouton-or mt-3 !py-2 text-sm">{vol ? "Le ballon vole…" : "Taper le drop"}</button>
          <p role="status" aria-live="polite" className={`mt-2 text-sm font-semibold min-h-5 ${msg?.ok ? "text-moutarde" : "text-white/80"}`}>{msg?.t}</p>
        </div>
        <div ref={zone} className="relative flex-1 min-w-64 h-40" aria-hidden>
          <span className="absolute bottom-0 inset-x-0 h-px bg-white/20" />
          <Poteaux className="absolute right-6 bottom-0 h-36 w-auto text-white/80" />
          <span ref={ballon} className="drop-ballon absolute left-4 bottom-1 block">
            <Ballon className="w-9 text-moutarde [--deco-trait:var(--bordeaux)]" />
          </span>
        </div>
      </div>
    </div>
  );
}
