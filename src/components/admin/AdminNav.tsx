"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Ballon, Coupe, Journal, Maillot, Podium, Poteaux, Sifflet, Supporter } from "../deco/Icones";

type Lien = { href: string; label: string; Icone: ComponentType<{ className?: string }>; badge?: number; exact?: boolean };
type Groupe = { titre: string; liens: Lien[] };

/** Navigation de l'admin, par grands espaces, avec compteurs de ce qui attend. */
export default function AdminNav({ brouillons, aSaisir, admin }: { brouillons: number; aSaisir: number; admin: boolean }) {
  const path = usePathname();
  const groupes: Groupe[] = [
    { titre: "", liens: [{ href: "/admin", label: "Aujourd'hui", Icone: Ballon, exact: true }] },
    { titre: "Rédaction", liens: [{ href: "/admin/articles", label: "Articles", Icone: Journal, badge: brouillons }] },
    {
      titre: "Matchs et stats",
      liens: [
        { href: "/admin/journee", label: "Saisie de journée", Icone: Sifflet, badge: aSaisir },
        { href: "/admin/matchs", label: "Matchs et direct", Icone: Coupe },
        { href: "/admin/stats-depart", label: "Stats de départ", Icone: Podium },
      ],
    },
    {
      titre: "Clubs et joueurs",
      liens: [
        { href: "/admin/clubs", label: "Clubs", Icone: Poteaux },
        { href: "/admin/joueurs", label: "Joueurs", Icone: Maillot },
      ],
    },
    {
      titre: "Réglages",
      liens: [
        { href: "/admin/donnees", label: "Données et synchros", Icone: Coupe },
        ...(admin ? [{ href: "/admin/utilisateurs", label: "Membres", Icone: Supporter }] : []),
      ],
    },
  ];
  const actif = (l: Lien) => (l.exact ? path === l.href : path === l.href || path.startsWith(l.href + "/"));

  return (
    <nav aria-label="Espace rédaction" className="grid gap-5">
      {groupes.map((g) => (
        <div key={g.titre || "accueil"}>
          {g.titre && <p className="px-3 mb-1 text-xs font-semibold text-white/50">{g.titre}</p>}
          <ul className="grid gap-0.5">
            {g.liens.map((l) => {
              const on = actif(l);
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={on ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${on ? "bg-white text-bordeaux" : "text-white/85 hover:bg-white/10"}`}>
                    <l.Icone className={`h-5 w-6 shrink-0 ${on ? "text-vin [--deco-trait:var(--moutarde)] [--ballon:var(--moutarde)]" : "text-moutarde [--deco-trait:var(--bordeaux)]"}`} />
                    <span className="flex-1">{l.label}</span>
                    {!!l.badge && <span className={`min-w-6 text-center text-xs rounded-full px-1.5 py-0.5 ${on ? "bg-vin text-white" : "bg-moutarde text-bordeaux"}`}>{l.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
