"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/matchs", label: "Matchs" },
  { href: "/competitions", label: "Compétitions" },
  { href: "/clubs", label: "Clubs" },
  { href: "/joueurs", label: "Joueurs" },
  { href: "/actus", label: "Actus" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Navigation principale" className="defile flex overflow-x-auto">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 px-3 py-3 md:py-2 text-[15px] font-semibold border-b-2 md:border-b-0 md:rounded-md ${
              active ? "border-moutarde md:bg-white/15" : "border-transparent text-white/85 hover:text-white md:hover:bg-white/10"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
