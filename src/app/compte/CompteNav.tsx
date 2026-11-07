"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/compte", label: "Mon tableau" },
  { href: "/compte/alertes", label: "Alertes" },
  { href: "/compte/profil", label: "Profil" },
];

export default function CompteNav() {
  const path = usePathname();
  return (
    <nav aria-label="Mon espace" className="defile-scroll flex gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={`shrink-0 px-4 py-2.5 font-semibold rounded-t-xl ${active ? "bg-fond text-encre" : "text-white/80 hover:text-white hover:bg-white/10"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
