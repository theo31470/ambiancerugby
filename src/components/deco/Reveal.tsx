"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Ajoute la classe "vu" quand le bloc entre à l'écran (une seule fois). */
export default function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("vu");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={className}>{children}</Tag>;
}
