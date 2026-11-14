"use client";
import { usePanier } from "@/lib/shop/panier";

/** Nombre d'articles du panier (gardé dans le navigateur), pour la ligne « Panier » de l'espace Moi. */
export function CompteurPanier() {
  const n = usePanier().reduce((s, l) => s + l.quantite, 0);
  if (!n) return null;
  return <span className="min-w-6 h-6 px-1.5 rounded-full bg-moutarde text-bordeaux text-xs font-bold grid place-items-center tnum">{n}</span>;
}
