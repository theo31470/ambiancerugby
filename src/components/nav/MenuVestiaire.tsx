"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LIENS } from "./liens";
import SonStade from "../deco/SonStade";
import { Ballon } from "../deco/Icones";

/** Menu mobile plein écran : le vestiaire, sur fond de lignes de terrain. */
export default function MenuVestiaire({ connecte, supporter, staff }: { connecte: boolean; supporter: boolean; staff: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const path = usePathname();
  const premier = useRef<HTMLAnchorElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    premier.current?.focus();
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    window.addEventListener("keydown", clavier);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener("keydown", clavier);
    };
  }, [ouvert]);

  const fermer = () => setOuvert(false);

  return (
    <>
      <button
        ref={bouton}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls="vestiaire"
        className="relative z-[70] w-11 h-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"
      >
        <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
        <span aria-hidden className="relative w-5 h-4">
          <span className={`absolute left-0 h-0.5 w-5 rounded bg-white transition-all duration-300 ${ouvert ? "top-[7px] rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 top-[7px] h-0.5 rounded bg-moutarde transition-all duration-300 ${ouvert ? "w-0 opacity-0" : "w-3.5"}`} />
          <span className={`absolute left-0 h-0.5 w-5 rounded bg-white transition-all duration-300 ${ouvert ? "top-[7px] -rotate-45" : "top-[14px]"}`} />
        </span>
      </button>

      {ouvert && (
        <div id="vestiaire" role="dialog" aria-modal="true" aria-label="Menu" className="vestiaire fixed inset-0 z-[60] bg-bordeaux text-white overflow-y-auto">
          {/* lignes du terrain */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            <g stroke="white" strokeOpacity=".08" strokeWidth="1.5">
              <line x1="0" y1="10" x2="100" y2="10" vectorEffect="non-scaling-stroke" /><line x1="0" y1="28" x2="100" y2="28" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="50" x2="100" y2="50" vectorEffect="non-scaling-stroke" /><line x1="0" y1="72" x2="100" y2="72" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="90" x2="100" y2="90" vectorEffect="non-scaling-stroke" /><line x1="12" y1="0" x2="12" y2="100" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" /><line x1="88" y1="0" x2="88" y2="100" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          <div className="relative min-h-full flex flex-col px-6 pt-28 pb-10">
            <p className="text-sm text-white/60 entree-vestiaire" style={{ ["--i" as string]: 0 }}>Le vestiaire</p>
            <ul className="mt-3 grid gap-1">
              {LIENS.map((l, i) => {
                const on = path === l.href || path.startsWith(l.href + "/");
                return (
                  <li key={l.href} className="entree-vestiaire" style={{ ["--i" as string]: i + 1 }}>
                    <Link ref={i === 0 ? premier : undefined} href={l.href} onClick={fermer} aria-current={on ? "page" : undefined}
                      className="group flex items-center gap-4 py-2.5">
                      <span className={`w-12 h-12 shrink-0 rounded-2xl grid place-items-center ${on ? "bg-moutarde" : "bg-white/10"}`}>
                        <l.Icone className={`h-7 w-auto ${on ? "text-bordeaux [--deco-trait:var(--moutarde)]" : "text-moutarde [--deco-trait:var(--bordeaux)]"}`} />
                      </span>
                      <span>
                        <span className={`groovy text-4xl block leading-none ${on ? "text-moutarde" : ""}`}>{l.label}</span>
                        <span className="text-sm text-white/60">{l.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 grid gap-3 entree-vestiaire" style={{ ["--i" as string]: LIENS.length + 1 }}>
              {connecte ? (
                <Link href="/compte" onClick={fermer} className="bouton-or justify-start">Mon espace</Link>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/inscription" onClick={fermer} className="bouton-or">Rejoindre</Link>
                  <Link href="/connexion" onClick={fermer} className="bouton-discret !bg-transparent !text-white !border-white/30">Connexion</Link>
                </div>
              )}
              {!supporter && (
                <Link href="/abonnement" onClick={fermer} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                  <Ballon className="w-10 text-moutarde [--deco-trait:var(--bordeaux)]" />
                  <span><span className="font-semibold block">Devenir Supporter</span><span className="text-sm text-white/70">Stats complètes, alertes, exclusivités. 2,99 €/mois</span></span>
                </Link>
              )}
              {staff && <Link href="/admin" onClick={fermer} className="text-white/80 underline underline-offset-4">Espace rédaction</Link>}
              <div className="mt-2"><SonStade variante="menu" /></div>
            </div>

            <img src="/logo-blanc.png" alt="" aria-hidden className="mt-auto pt-10 w-32 opacity-20 self-end -rotate-12" />
          </div>
        </div>
      )}
    </>
  );
}
