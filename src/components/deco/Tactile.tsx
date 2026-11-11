"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Réponses au toucher sur tout le site :
 * - une barre dorée en haut de l'écran dès qu'on clique un lien, jusqu'à l'arrivée sur la page ;
 * - une onde qui part du doigt sur les boutons.
 */
export default function Tactile() {
  const [etat, setEtat] = useState<"repos" | "route" | "arrivee">("repos");
  const depart = useRef<string | null>(null);

  useEffect(() => {
    let sonde: ReturnType<typeof setInterval> | undefined;
    let securite: ReturnType<typeof setTimeout> | undefined;
    const arrive = () => {
      clearInterval(sonde); clearTimeout(securite);
      depart.current = null;
      document.documentElement.removeAttribute("data-navigation");
      setEtat((e) => (e === "route" ? "arrivee" : e));
      setTimeout(() => setEtat((e) => (e === "arrivee" ? "repos" : e)), 600);
    };

    const clic = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // ancre ou même page
      depart.current = location.href;
      setEtat("route");
      document.documentElement.setAttribute("data-navigation", "");
      clearInterval(sonde); clearTimeout(securite);
      // l'adresse change quand la nouvelle page s'affiche
      sonde = setInterval(() => { if (location.href !== depart.current) arrive(); }, 80);
      securite = setTimeout(arrive, 12000);
    };

    const onde = (ev: PointerEvent) => {
      const b = (ev.target as Element | null)?.closest?.(".bouton, .bouton-or, .bouton-discret, [data-onde]") as HTMLElement | null;
      if (!b || (b as HTMLButtonElement).disabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const r = b.getBoundingClientRect();
      const taille = Math.max(r.width, r.height) * 2.2;
      const s = document.createElement("span");
      s.className = "onde";
      s.style.cssText = `width:${taille}px;height:${taille}px;left:${ev.clientX - r.left - taille / 2}px;top:${ev.clientY - r.top - taille / 2}px`;
      b.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    };

    document.addEventListener("click", clic);
    document.addEventListener("pointerdown", onde, { passive: true });
    window.addEventListener("popstate", arrive);
    return () => {
      document.removeEventListener("click", clic);
      document.removeEventListener("pointerdown", onde);
      window.removeEventListener("popstate", arrive);
      clearInterval(sonde); clearTimeout(securite);
    };
  }, []);

  return <div className="barre-navigation" data-etat={etat} aria-hidden />;
}
