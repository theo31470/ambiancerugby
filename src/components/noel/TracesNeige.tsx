"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Générateur pseudo-aléatoire : chaque couche de neige est unique mais stable d'un rendu à l'autre. */
function alea(seed: number) { let s = seed % 2147483646 + 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

/** Dessine une couche de neige irrégulière (bosses, coulures, ombre bleutée au contact) pour un bord de largeur w. */
function couche(w: number, rayon: number, graine: number) {
  const r = alea(graine), h = 24, base = 12;
  const marge = Math.min(rayon * 0.55, 18);
  const n = Math.max(5, Math.round(w / 26));
  const pts: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const x = marge + ((w - 2 * marge) * k) / n;
    pts.push([x, k === 0 || k === n ? base - 1 : base - 3 - r() * 6]);
  }
  let d = `M${marge - 4} ${base + 1} Q${marge - 2} ${base - 1} ${pts[0][0]} ${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    d += ` Q${x0 + (x1 - x0) * 0.25} ${Math.min(y0, y1) - 2.5} ${(x0 + x1) / 2} ${(y0 + y1) / 2} T${x1} ${y1}`;
  }
  d += ` Q${w - marge + 2} ${base - 1} ${w - marge + 4} ${base + 1}`;
  let bas = ` L${w - marge + 2} ${base + 2.5}`;
  for (let x = w - marge; x > marge; x -= 14 + r() * 16) {
    if (r() < 0.26) { const L = 4 + r() * 6; bas += ` L${x + 3} ${base + 2.5} Q${x + 3} ${base + 2.5 + L} ${x} ${base + 2.5 + L} Q${x - 3} ${base + 2.5 + L} ${x - 3} ${base + 2.5}`; }
    else bas += ` L${x} ${base + 2 + r() * 1.5}`;
  }
  bas += ` L${marge - 2} ${base + 2.5}Z`;
  const grains = Array.from({ length: 3 }, () => `<circle cx="${marge + r() * (w - 2 * marge)}" cy="${base - 2 - r() * 3}" r="${0.6 + r() * 0.6}" fill="#dfe9f4"/>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}${bas}" fill="url(#noel-couche)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M${marge} ${base + 2.4} H${w - marge}" stroke="#b9cadb" stroke-width=".9" opacity=".7"/>${grains}</svg>`;
}

const CIBLES_SITE = "[data-neige], main .bouton, main .bouton-or, main .bg-surface.rounded-2xl, main .bg-surface.rounded-3xl";

/**
 * Pose de la neige sur le haut des cartes et des boutons visibles. Les éléments qui coupent leur contenu
 * (overflow hidden) sont ignorés, sinon la neige serait rognée. Limité pour garder la page légère.
 */
export default function TracesNeige({ cibles = CIBLES_SITE, max = 18 }: { cibles?: string; max?: number }) {
  const chemin = usePathname();
  useEffect(() => {
    const poser = () => {
      let poses = document.querySelectorAll(".noel-couche").length;
      const els = Array.from(document.querySelectorAll<HTMLElement>(cibles));
      for (const el of els) {
        if (poses >= max) break;
        if (el.dataset.neigePosee || el.closest("[data-sans-neige]")) continue;
        const st = getComputedStyle(el);
        if (st.overflow !== "visible" && !el.hasAttribute("data-neige")) continue;
        const w = el.offsetWidth;
        if (w < 90 || el.offsetHeight < 28) continue;
        if (st.position === "static") el.style.position = "relative";
        const cap = document.createElement("span");
        cap.className = "noel-couche";
        cap.setAttribute("aria-hidden", "true");
        cap.innerHTML = couche(w + 6, parseFloat(st.borderTopLeftRadius) || 0, w * 7 + poses * 131 + chemin.length);
        el.appendChild(cap);
        el.dataset.neigePosee = "1";
        poses++;
      }
    };
    // après l'affichage, puis quand le contenu chargé tardivement est arrivé ; sans annulation :
    // les éléments déjà enneigés sont marqués, un second passage ne fait rien de plus
    for (const ms of [300, 1500, 4000]) setTimeout(poser, ms);
    // la page arrive en flux : on repasse aussi une fois tout chargé
    if (document.readyState !== "complete") window.addEventListener("load", () => { poser(); setTimeout(poser, 1500); }, { once: true });
  }, [chemin, cibles, max]);
  return null;
}
