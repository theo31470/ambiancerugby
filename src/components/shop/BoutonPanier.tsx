"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePanier } from "@/lib/shop/panier";

/** Sac de la boutique dans l'en-tête : saute quand on ajoute un article, affiche le nombre d'articles. */
export default function BoutonPanier() {
  const lignes = usePanier();
  const n = lignes.reduce((s, l) => s + l.quantite, 0);
  const [saut, setSaut] = useState(0);
  const sac = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const f = () => setSaut((x) => x + 1);
    window.addEventListener("ar:panier", f);
    return () => window.removeEventListener("ar:panier", f);
  }, []);
  return (
    <Link href={n ? "/boutique/panier" : "/boutique"} aria-label={n ? `Panier, ${n} article${n > 1 ? "s" : ""}` : "Boutique"}
      className="relative flex items-center gap-1.5 h-10 px-2.5 rounded-full hover:bg-white/10">
      <span ref={sac} key={saut} className={saut ? "inline-block animate-[sac_.5s_ease-out]" : "inline-block"} aria-hidden>
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" fill="var(--moutarde)" stroke="var(--moutarde)" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      </span>
      <span className="hidden 2xl:inline">Boutique</span>
      {n > 0 && <span className="absolute -top-0.5 right-0 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-white text-vin text-[11px] font-bold tnum">{n}</span>}
    </Link>
  );
}
