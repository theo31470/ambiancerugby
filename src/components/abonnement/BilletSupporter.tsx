"use client";
import { useRef } from "react";

/**
 * Billet de tribune du Supporter : se remplit pendant la saisie, s'incline sous la souris,
 * et reçoit son tampon « Validé » une fois le paiement accepté.
 */
export default function BilletSupporter({ nom, formule, depuis, valide = false }: { nom: string; formule: string; depuis: string; valide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const bouge = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 9).toFixed(2)}deg`);
  };
  const repos = () => { ref.current?.style.setProperty("--ry", "0deg"); ref.current?.style.setProperty("--rx", "0deg"); };
  return (
    <div ref={ref} className="billet" onPointerMove={bouge} onPointerLeave={repos} role="img" aria-label={`Billet Supporter ${formule.toLowerCase()} au nom de ${nom || "votre nom"}`}>
      <div className="billet-corps">
        <div className="flex items-start justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-blanc.png" alt="" className="h-9 w-auto" />
          <span className="whitespace-nowrap rounded-full bg-moutarde px-2 py-0.5 text-[10px] font-bold text-bordeaux">Tribune d&apos;honneur</span>
        </div>
        <p className="mt-5 text-[11px] text-white/60">Supporter</p>
        <p key={nom ? "plein" : "vide"} className="groovy truncate text-[1.45rem] leading-tight text-white">{nom.trim() || "Votre nom"}</p>
        <div className="mt-4 grid grid-cols-[auto_auto_auto] justify-between gap-2 whitespace-nowrap text-[11px]">
          <span><span className="block text-white/50">Formule</span><span className="font-bold text-white">{formule}</span></span>
          <span><span className="block text-white/50">Depuis</span><span className="font-bold text-white">{depuis}</span></span>
          <span><span className="block text-white/50">Place</span><span className="font-bold text-moutarde">Partout</span></span>
        </div>
      </div>
      <div className="billet-talon" aria-hidden>
        <span className="billet-code" />
        <span className="text-[10px] font-bold tracking-wider text-bordeaux/70 [writing-mode:vertical-rl]">ADMIS</span>
      </div>
      {valide && <span className="billet-tampon" aria-hidden>Validé</span>}
    </div>
  );
}
