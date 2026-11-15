"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { enApp, vibrer } from "@/lib/app";

const SEUIL = 72;

/**
 * « Tirer pour rafraîchir », comme dans les apps : dans l'app installée, tirer la page vers le bas depuis le haut
 * recharge les données (scores, classements) sans recharger l'écran. Le navigateur classique garde son propre geste.
 */
export default function TirerPourRafraichir() {
  const router = useRouter();
  const [tirage, setTirage] = useState(0);
  const [charge, demarrer] = useTransition();
  const depart = useRef<number | null>(null);
  const passe = useRef(false);

  useEffect(() => {
    if (!enApp()) return;
    const debut = (e: TouchEvent) => {
      // seulement tout en haut de la page, et pas depuis un tiroir, une fenêtre ou une zone qui défile de côté
      const cible = e.target as Element | null;
      if (window.scrollY > 2 || cible?.closest("dialog, [data-pas-tirer], .overflow-x-auto")) { depart.current = null; return; }
      depart.current = e.touches[0].clientY;
      passe.current = false;
    };
    const bouge = (e: TouchEvent) => {
      if (depart.current == null) return;
      const dy = (e.touches[0].clientY - depart.current) * 0.5;
      if (dy <= 0 || window.scrollY > 2) { setTirage(0); return; }
      const t = Math.min(dy, 110);
      if (t >= SEUIL && !passe.current) { passe.current = true; vibrer(10); }
      if (t < SEUIL) passe.current = false;
      setTirage(t);
    };
    const fin = () => {
      if (depart.current == null) return;
      depart.current = null;
      setTirage((t) => {
        if (t >= SEUIL) demarrer(() => router.refresh());
        return 0;
      });
    };
    window.addEventListener("touchstart", debut, { passive: true });
    window.addEventListener("touchmove", bouge, { passive: true });
    window.addEventListener("touchend", fin);
    window.addEventListener("touchcancel", fin);
    return () => {
      window.removeEventListener("touchstart", debut);
      window.removeEventListener("touchmove", bouge);
      window.removeEventListener("touchend", fin);
      window.removeEventListener("touchcancel", fin);
    };
  }, [router]);

  const visible = tirage > 4 || charge;
  const y = charge ? SEUIL * 0.8 : tirage * 0.8;
  return (
    <div aria-live="polite" className="fixed inset-x-0 z-[60] flex justify-center pointer-events-none" style={{ top: "env(safe-area-inset-top)" }}>
      <span className={`mt-2 grid place-items-center w-11 h-11 rounded-full bg-surface text-vin shadow-[0_6px_20px_-6px_rgba(62,22,33,.45)] ${tirage ? "" : "transition-[transform,opacity] duration-300"}`}
        style={{ transform: `translateY(${y - 40}px) scale(${visible ? 1 : 0.6})`, opacity: visible ? Math.min(1, tirage / SEUIL + (charge ? 1 : 0)) : 0 }}>
        <svg viewBox="0 0 24 24" className={`w-6 h-6 ${charge ? "animate-spin" : ""}`} style={charge ? undefined : { transform: `rotate(${tirage * 3}deg)` }} aria-hidden>
          <g transform="rotate(-35 12 12)"><ellipse cx="12" cy="12" rx="9" ry="5.6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8.5 9.6v4.8M15.5 9.6v4.8M10 12h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></g>
        </svg>
        <span className="sr-only">{charge ? "Actualisation…" : tirage >= SEUIL ? "Relâchez pour actualiser" : ""}</span>
      </span>
    </div>
  );
}
