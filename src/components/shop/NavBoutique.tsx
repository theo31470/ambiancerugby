"use client";
import { usePanier } from "@/lib/shop/panier";

/** Pastille « Panier » flottante sur les pages de la boutique, dès qu'il y a un article : ouvre le tiroir. */
export default function NavBoutique() {
  const n = usePanier().reduce((s, l) => s + l.quantite, 0);
  if (!n) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("ar:panier-ouvrir"))}
      aria-label={`Ouvrir le panier, ${n} article${n > 1 ? "s" : ""}`}
      className="fixed right-4 bottom-24 lg:bottom-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-bordeaux text-white pl-4 pr-2 py-2 font-semibold shadow-[0_10px_30px_-8px_rgba(62,22,33,.6)] hover:-translate-y-0.5 transition-transform">
      Panier
      <span className="min-w-7 h-7 px-1.5 grid place-items-center rounded-full bg-moutarde text-bordeaux text-sm tnum">{n}</span>
    </button>
  );
}
