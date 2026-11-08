"use client";
import { useSyncExternalStore } from "react";

/** Panier gardé dans le navigateur : identifiant de déclinaison et quantité. Les prix sont toujours recalculés par le serveur. */
export type LignePanier = { variant_id: string; quantite: number };
const CLE = "ar-panier";
const vide: LignePanier[] = [];
let cache: LignePanier[] | null = null;
const abonnes = new Set<() => void>();

function lire(): LignePanier[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(CLE) ?? "[]"); } catch { cache = []; }
  if (!Array.isArray(cache)) cache = [];
  return cache!;
}
function ecrire(l: LignePanier[]) {
  cache = l.filter((x) => x.quantite > 0).map((x) => ({ ...x, quantite: Math.min(20, x.quantite) }));
  try { localStorage.setItem(CLE, JSON.stringify(cache)); } catch { /* navigation privée */ }
  abonnes.forEach((f) => f());
  window.dispatchEvent(new CustomEvent("ar:panier"));
}
export const panier = {
  ajouter(variant_id: string, quantite = 1) {
    const l = [...lire()];
    const i = l.findIndex((x) => x.variant_id === variant_id);
    if (i >= 0) l[i] = { ...l[i], quantite: l[i].quantite + quantite }; else l.push({ variant_id, quantite });
    ecrire(l);
  },
  changer(variant_id: string, quantite: number) { ecrire(lire().map((x) => (x.variant_id === variant_id ? { ...x, quantite } : x))); },
  retirer(variant_id: string) { ecrire(lire().filter((x) => x.variant_id !== variant_id)); },
  vider() { ecrire([]); },
};

function abonner(f: () => void) {
  abonnes.add(f);
  const autreOnglet = (e: StorageEvent) => { if (e.key === CLE) { cache = null; f(); } };
  window.addEventListener("storage", autreOnglet);
  return () => { abonnes.delete(f); window.removeEventListener("storage", autreOnglet); };
}
export function usePanier() {
  return useSyncExternalStore(abonner, lire, () => vide);
}
