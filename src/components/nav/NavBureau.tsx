"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Ballon } from "../deco/Icones";
import { LIENS as TOUS } from "./liens";

const LIENS = TOUS.filter((l) => !("bureau" in l) || l.bureau !== false);

/** Menu bureau : un ballon roule sous les liens, suit la souris et revient se poser sur la page active. */
export default function NavBureau() {
  const path = usePathname();
  const active = LIENS.findIndex((l) => path === l.href || path.startsWith(l.href + "/"));
  const liens = useRef<(HTMLAnchorElement | null)[]>([]);
  const ballon = useRef<HTMLSpanElement>(null);

  const poser = useCallback((i: number) => {
    const b = ballon.current;
    const el = i >= 0 ? liens.current[i] : null;
    if (!b) return;
    if (!el) {
      b.style.opacity = "0";
      return;
    }
    const x = el.offsetLeft + el.offsetWidth / 2 - 13;
    // le ballon roule (un tour complet tous les ~80 px) et se pose toujours à plat
    const tours = Math.round(x / 80);
    b.style.opacity = "1";
    b.style.transform = `translateX(${x}px) rotate(${tours * 360}deg)`;
  }, []);

  useEffect(() => {
    poser(active);
    const onResize = () => poser(active);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, poser]);

  return (
    <nav aria-label="Navigation principale" className="relative" onMouseLeave={() => poser(active)}>
      <ul className="flex flex-nowrap items-center gap-0.5">
        {LIENS.map((l, i) => {
          const on = i === active;
          return (
            <li key={l.href}>
              <Link
                ref={(el) => { liens.current[i] = el; }}
                href={l.href}
                aria-current={on ? "page" : undefined}
                onMouseEnter={() => poser(i)}
                onFocus={() => poser(i)}
                className={`group flex items-center gap-2 whitespace-nowrap px-2.5 2xl:px-3 py-2 rounded-full text-[15px] font-semibold text-white transition-colors ${on ? "bg-white/15" : "hover:bg-white/10"}`}
              >
                <l.Icone className="h-5 w-auto text-moutarde group-hover:animate-[roulis_.6s_ease-in-out] [--deco-trait:var(--vin)]" />
                {"court" in l && l.court ? l.court : l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* le ballon qui roule sous le menu */}
      <span ref={ballon} aria-hidden className="absolute -bottom-[7px] left-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.3,1.5,.5,1)] opacity-0">
        <Ballon className="w-[26px] text-moutarde [--deco-trait:var(--vin)]" />
      </span>
    </nav>
  );
}
