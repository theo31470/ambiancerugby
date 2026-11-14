"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Onglets internes d'une rubrique, en haut de la page sur mobile (comme dans une app) :
 * Matchs | Classements — Clubs | Joueurs | Indice — Pronos & ligues | XV de la semaine.
 * N'apparaissent que sur les pages d'entrée de la rubrique, pas sur les fiches.
 */
const GROUPES = [
  [{ href: "/matchs", label: "Matchs" }, { href: "/competitions", label: "Classements" }],
  [{ href: "/clubs", label: "Clubs" }, { href: "/joueurs", label: "Joueurs" }, { href: "/indice", label: "Indice" }],
  [{ href: "/pronos", label: "Pronos & ligues" }, { href: "/pronos/xv", label: "XV de la semaine" }],
];

export default function SousOnglets() {
  const path = usePathname() ?? "/";
  const groupe = GROUPES.find((g) => g.some((o) => o.href === path));
  if (!groupe) return null;
  const actif = groupe.findIndex((o) => o.href === path);
  return (
    <nav aria-label="Dans cette rubrique" className="lg:hidden -mt-2 mb-5">
      <ul className="relative grid rounded-full bg-teinte p-1" style={{ gridTemplateColumns: `repeat(${groupe.length}, minmax(0, 1fr))` }}>
        {/* pastille qui glisse */}
        <span aria-hidden className="absolute inset-y-1 left-1 rounded-full bg-vin shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)]"
          style={{ width: `calc((100% - 0.5rem) / ${groupe.length})`, transform: `translateX(${actif * 100}%)` }} />
        {groupe.map((o, i) => (
          <li key={o.href} className="relative">
            <Link href={o.href} aria-current={i === actif ? "page" : undefined} replace
              className={`block text-center text-sm font-semibold py-2 px-2 rounded-full truncate transition-colors ${i === actif ? "text-white" : "text-sourdine"}`}>
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
