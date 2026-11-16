"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * En-tête collant : il se resserre quand on descend, et sur téléphone il s'efface pendant la descente
 * pour laisser toute la place au contenu, puis revient dès qu'on remonte (comme dans les applis de sport).
 */
export default function EnteteCollant({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let reduit = false, cache = false, dernier = window.scrollY, cumul = 0, image = 0;
    const regler = (attr: string, v: boolean) => el.toggleAttribute(attr, v);
    const maj = () => {
      image = 0;
      const y = window.scrollY;
      const r = y > 60;
      if (r !== reduit) { reduit = r; regler("data-reduit", r); }
      const d = y - dernier;
      dernier = y;
      // on accumule dans un même sens pour ignorer les petits tremblements du doigt
      cumul = Math.sign(d) === Math.sign(cumul) ? cumul + d : d;
      const c = y < 120 || document.documentElement.hasAttribute("data-menu") ? false : cumul > 24 ? true : cumul < -12 ? false : cache;
      if (c !== cache) { cache = c; regler("data-cache", c); }
    };
    const surDefilement = () => { if (!image) image = requestAnimationFrame(maj); };
    maj();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => { window.removeEventListener("scroll", surDefilement); if (image) cancelAnimationFrame(image); };
  }, []);
  return (
    <header ref={ref} className="entete group sticky top-0 z-40 bg-vin text-white transition-shadow data-[reduit]:shadow-[0_4px_0_0_rgba(62,22,33,.35)]">
      {children}
    </header>
  );
}
