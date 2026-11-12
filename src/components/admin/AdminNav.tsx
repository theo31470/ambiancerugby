"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Ballon, Beret, Coupe, Echarpe, Journal, Maillot, Pinte, Podium, Poteaux, Sifflet, Supporter, Trompette } from "../deco/Icones";

type Lien = { href: string; label: string; Icone: ComponentType<{ className?: string }>; badge?: number; exact?: boolean };
type Groupe = { titre: string; liens: Lien[] };

/** Navigation de l'admin, par grands espaces, avec compteurs de ce qui attend. */
export default function AdminNav({ brouillons, aSaisir, admin, commentaires = 0, aTraiter = 0 }: { brouillons: number; aSaisir: number; admin: boolean; commentaires?: number; aTraiter?: number }) {
  const path = usePathname();
  const groupes: Groupe[] = [
    { titre: "", liens: [{ href: "/studio", label: "Aujourd'hui", Icone: Ballon, exact: true }] },
    {
      titre: "Rédaction",
      liens: [
        { href: "/studio/contenu", label: "Contenu et réseaux", Icone: Trompette, exact: true },
        { href: "/studio/articles", label: "Articles", Icone: Journal, badge: brouillons },
        { href: "/studio/commentaires", label: "Commentaires", Icone: Trompette, badge: commentaires },
      ],
    },
    {
      titre: "Matchs et stats",
      liens: [
        { href: "/studio/journee", label: "Saisie de journée", Icone: Sifflet, badge: aSaisir },
        { href: "/studio/matchs", label: "Matchs et direct", Icone: Coupe },
        { href: "/studio/stats-depart", label: "Stats de départ", Icone: Podium },
      ],
    },
    {
      titre: "Boutique",
      liens: [
        { href: "/studio/boutique", label: "Commandes", Icone: Pinte, badge: aTraiter, exact: true },
        { href: "/studio/boutique/produits", label: "Produits", Icone: Maillot },
        { href: "/studio/boutique/reglages", label: "Réglages boutique", Icone: Beret },
      ],
    },
    {
      titre: "Compétitions, clubs, joueurs",
      liens: [
        { href: "/studio/competitions", label: "Compétitions", Icone: Coupe },
        { href: "/studio/clubs", label: "Clubs", Icone: Poteaux },
        { href: "/studio/joueurs", label: "Joueurs", Icone: Maillot },
      ],
    },
    {
      titre: "Réglages",
      liens: [
        ...(admin ? [{ href: "/studio/utilisateurs", label: "Membres", Icone: Supporter }] : []),
        ...(admin ? [{ href: "/studio/site", label: "Contenu du site", Icone: Echarpe }] : []),
        { href: "/studio/donnees", label: "Données et synchros", Icone: Ballon },
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
