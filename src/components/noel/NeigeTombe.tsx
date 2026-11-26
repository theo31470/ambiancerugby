"use client";
import { useEffect, useState } from "react";

type Flocon = { left: number; taille: number; opacite: number; duree: number; retard: number; derive: number };

/** Flocons qui tombent doucement par-dessus la page (jamais cliquables, coupés si l'appareil limite les animations). */
export default function NeigeTombe({ nombre = 36, className = "fixed inset-0 z-[45]" }: { nombre?: number; className?: string }) {
  const [flocons, setFlocons] = useState<Flocon[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = window.innerWidth < 640 ? Math.round(nombre / 2) : nombre;
    const f = Array.from({ length: n }, () => {
      const duree = 9 + Math.random() * 11;
      return { left: Math.random() * 100, taille: 2 + Math.random() * 4.5, opacite: 0.55 + Math.random() * 0.45, duree, retard: -Math.random() * duree, derive: Math.random() * 70 - 35 };
    });
    const t = setTimeout(() => setFlocons(f), 0);
    return () => clearTimeout(t);
  }, [nombre]);
  if (!flocons.length) return null;
  return (
    <div className={`noel-neige pointer-events-none overflow-hidden ${className}`} aria-hidden>
      {flocons.map((f, i) => (
        <i key={i} style={{ left: `${f.left}%`, width: f.taille, height: f.taille, opacity: f.opacite, animationDuration: `${f.duree}s`, animationDelay: `${f.retard}s`, ["--derive" as string]: `${f.derive}px` }} />
      ))}
    </div>
  );
}
