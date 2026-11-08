"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** En-tête collant qui se resserre quand on descend dans la page. */
export default function EnteteCollant({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let reduit = false;
    const maj = () => {
      const r = window.scrollY > 60;
      if (r !== reduit) {
        reduit = r;
        el.toggleAttribute("data-reduit", r);
      }
    };
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);
  return (
    <header ref={ref} className="entete group sticky top-0 z-40 bg-vin text-white transition-shadow data-[reduit]:shadow-[0_4px_0_0_rgba(62,22,33,.35)]">
      {children}
    </header>
  );
}
