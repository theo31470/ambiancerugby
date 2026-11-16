"use client";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** Carrousel plein écran aimanté, avec des points qui suivent la carte affichée (façon stories). */
export default function CarrouselPoints({ children, etiquette }: { children: ReactNode; etiquette: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = Children.count(children);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let image = 0;
    const maj = () => {
      image = 0;
      const enfants = [...el.firstElementChild!.children] as HTMLElement[];
      const centre = el.scrollLeft + el.clientWidth / 2;
      let meilleur = 0, d = Infinity;
      enfants.forEach((c, k) => { const dc = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centre); if (dc < d) { d = dc; meilleur = k; } });
      setI(meilleur);
    };
    const surDefile = () => { if (!image) image = requestAnimationFrame(maj); };
    el.addEventListener("scroll", surDefile, { passive: true });
    return () => { el.removeEventListener("scroll", surDefile); if (image) cancelAnimationFrame(image); };
  }, []);
  const aller = (k: number) => {
    const el = ref.current;
    const c = el?.firstElementChild?.children[k] as HTMLElement | undefined;
    if (el && c) el.scrollTo({ left: c.offsetLeft - 16, behavior: "smooth" });
  };
  return (
    <div role="region" aria-roledescription="carrousel" aria-label={etiquette}>
      <div ref={ref} className="defile-scroll overflow-x-auto snap-x snap-mandatory scroll-px-4 overscroll-x-contain [scrollbar-width:none]">
        <div className="flex gap-3 px-4 w-max">{children}</div>
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: n }, (_, k) => (
            <button key={k} type="button" onClick={() => aller(k)} aria-label={`Carte ${k + 1} sur ${n}`} aria-current={k === i ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? "w-5 bg-vin" : "w-1.5 bg-trait"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
