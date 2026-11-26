"use client";
import { useRef, useState, type MouseEvent } from "react";
import { Buteur } from "./Bonshommes";

/** Un sapin, ses boules qui clignotent et son étoile qui scintille. */
function Sapin({ className, petit = false }: { className: string; petit?: boolean }) {
  return (
    <svg className={`noel-sapin ${className}`} viewBox="-2 -6 44 78" aria-hidden>
      <path d="M20 2 L34 22 H26 L38 40 H28 L42 62 H-2 L12 40 H2 L14 22 H6Z" fill="#2f6b45" />
      <path d="M8 22 Q14 19 20 21 Q27 18 32 22 L28 23 Q20 21 12 23Z M3 40 Q12 36 20 39 Q29 36 37 40 L31 41 Q20 39 9 41Z M-1 62 Q10 57 20 60 Q31 57 41 62Z" fill="#fff" />
      <rect x="17" y="62" width="6" height="8" fill="#6b4226" />
      {!petit && <path className="noel-etoile" d="M20 -5l1.6 3.8 4 .3-3.1 2.6 1 4L20 3.6l-3.5 2.1 1-4-3.1-2.6 4-.3z" fill="#f2b53a" />}
      <circle className="noel-b1" cx="14" cy="30" r="2.4" fill="#f2b53a" /><circle className="noel-b2" cx="26" cy="47" r="2.4" fill="#c0392b" />
      <circle className="noel-b3" cx="12" cy="53" r="2.4" fill="#f6e4e8" /><circle className="noel-b1" cx="25" cy="29" r="2" fill="#c0392b" />
    </svg>
  );
}

/**
 * Bande enneigée au-dessus du pied de page : sapins, poteaux en sucre d'orge, et un bonhomme de neige
 * qui tente la transformation quand on clique dessus. Un clic dans la neige y lance une boule de neige.
 */
export default function SceneNoel() {
  const scene = useRef<HTMLDivElement>(null);
  const tee = useRef<SVGSVGElement>(null);
  const poteaux = useRef<SVGSVGElement>(null);
  const [tir, setTir] = useState(false);
  const [bulle, setBulle] = useState<{ x: number; y: number } | null>(null);
  const [ploufs, setPloufs] = useState<{ id: number; x: number; y: number }[]>([]);

  const transformer = () => {
    const s = scene.current, t = tee.current, p = poteaux.current;
    if (tir || !s || !t || !p) return;
    setTir(true);
    const sr = s.getBoundingClientRect(), tr = t.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const x0 = tr.left - sr.left, y0 = tr.top - sr.top, x1 = pr.left - sr.left + pr.width / 2 - 15, y1 = pr.top - sr.top + pr.height * 0.25;
    const balle = t.cloneNode(true) as SVGSVGElement;
    Object.assign(balle.style, { position: "absolute", left: `${x0}px`, top: `${y0}px`, zIndex: "5", pointerEvents: "none" });
    s.appendChild(balle);
    t.style.visibility = "hidden";
    const haut = Math.min(220, sr.height + 120);
    const kf = Array.from({ length: 21 }, (_, k) => { const q = k / 20; return { transform: `translate(${(x1 - x0) * q}px, ${(y1 - y0) * q - haut * 4 * q * (1 - q)}px) rotate(${q * 720}deg) scale(${1 - q * 0.35})` }; });
    balle.animate(kf, { duration: 1100, easing: "cubic-bezier(.3,.1,.5,1)", fill: "forwards" }).onfinish = () => {
      setBulle({ x: x1, y: y1 });
      setTimeout(() => { setBulle(null); balle.remove(); t.style.visibility = ""; setTir(false); }, 1900);
    };
  };

  const bouleDeNeige = (e: MouseEvent) => {
    const sr = scene.current?.getBoundingClientRect();
    if (!sr) return;
    const id = Date.now();
    setPloufs((p) => [...p, { id, x: e.clientX - sr.left, y: e.clientY - sr.top }]);
    setTimeout(() => setPloufs((p) => p.filter((x) => x.id !== id)), 700);
  };

  return (
    <div ref={scene} className="noel-scene relative h-36 sm:h-44 overflow-hidden select-none" data-sans-neige>
      {/* sol enneigé et empreintes de crampons qui mènent au buteur */}
      <svg className="absolute inset-x-0 bottom-0 w-full h-24 cursor-pointer" viewBox="0 0 1280 96" preserveAspectRatio="none" onClick={bouleDeNeige} aria-hidden>
        <path d="M0 96V44 Q60 22 140 38 T300 34 T460 42 T620 30 T780 40 T940 32 T1100 42 T1280 36V96Z" fill="url(#noel-couche)" />
        <path d="M0 44 Q60 22 140 38 T300 34 T460 42 T620 30 T780 40 T940 32 T1100 42 T1280 36" fill="none" stroke="#fff" strokeWidth="3" />
        <g fill="#c9d6e4">
          {Array.from({ length: 8 }, (_, k) => (
            <g key={k} transform={`translate(${70 + k * 22} ${70 + (k % 2 ? 6 : -2)}) rotate(-8)`} opacity={0.35 + k * 0.07}>
              <ellipse rx="7" ry="3.2" /><g fill="#b3c4d6"><circle cx="-4" cy="-1" r=".9" /><circle cx="-1" cy="1" r=".9" /><circle cx="2" cy="-1" r=".9" /><circle cx="5" cy="1" r=".9" /></g>
            </g>
          ))}
        </g>
      </svg>
      <Sapin className="absolute left-[2%] bottom-10 w-11 h-auto" />
      <Sapin className="absolute left-[6%] bottom-8 w-8 h-auto hidden sm:block" petit />

      <button type="button" onClick={transformer} className={`noel-buteur group absolute left-[22%] sm:left-[18%] bottom-5 ${tir ? "noel-tir" : ""}`} aria-label="Le bonhomme de neige tente la transformation">
        <span className="noel-aide absolute left-1/2 -top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-bordeaux text-white text-[11px] font-bold px-2.5 py-0.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">Tente la transfo !</span>
        <Buteur />
        <svg ref={tee} className="absolute left-[74px] top-[66px]" width="30" height="22" viewBox="-15 -11 30 22" aria-hidden><g transform="rotate(-70)"><use href="#noel-ballon" /></g></svg>
      </button>

      <svg ref={poteaux} className="absolute right-[10%] sm:right-[9%] bottom-6 w-16 sm:w-[86px] h-auto" viewBox="0 0 90 150" aria-hidden>
        <rect x="10" y="12" width="7" height="138" rx="3.5" fill="url(#noel-sucre)" /><rect x="73" y="12" width="7" height="138" rx="3.5" fill="url(#noel-sucre)" />
        <path d="M10 15 Q10 2 2 4" stroke="url(#noel-sucre)" strokeWidth="7" fill="none" strokeLinecap="round" />
        <rect x="10" y="86" width="70" height="6" rx="3" fill="url(#noel-sucre)" />
        <path d="M9 12 Q13 6 18 12Z M72 12 Q76 6 81 12Z M10 86 Q45 79 80 86Z" fill="#fff" />
      </svg>
      <svg className="noel-gigote absolute right-[2%] bottom-9 w-9 h-9" viewBox="0 0 24 24" aria-hidden><use href="#noel-cadeau" /></svg>

      {bulle && <span role="status" className="noel-bulle absolute z-10 -translate-x-full whitespace-nowrap rounded-2xl bg-moutarde text-bordeaux groovy text-lg sm:text-xl px-3.5 py-1.5" style={{ left: bulle.x - 10, top: Math.max(4, bulle.y - 10) }}>Transformation réussie !</span>}
      {ploufs.map((p) => (
        <svg key={p.id} className="noel-plouf absolute pointer-events-none" style={{ left: p.x - 13, top: p.y - 13 }} width="26" height="26" viewBox="-13 -13 26 26" aria-hidden>
          <g fill="#fff" stroke="#c9d6e4" strokeWidth=".6"><circle r="5" /><circle cx="9" cy="-3" r="2" /><circle cx="-8" cy="4" r="2.4" /><circle cx="3" cy="9" r="1.6" /><circle cx="-4" cy="-9" r="1.8" /><circle cx="10" cy="6" r="1.2" /></g>
        </svg>
      ))}
    </div>
  );
}
