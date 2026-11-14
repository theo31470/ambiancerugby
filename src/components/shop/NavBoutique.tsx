"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanier } from "@/lib/shop/panier";

const LIENS = [
  { href: "/boutique", label: "La boutique", actif: (p: string) => p === "/boutique" || (/^\/boutique\/[^/]+$/.test(p) && !["/boutique/panier", "/boutique/paiement", "/boutique/aide", "/boutique/cgv"].includes(p)) },
  { href: "/suivi", label: "Suivre une commande", actif: (p: string) => p.startsWith("/suivi") },
  { href: "/boutique/aide", label: "Aide, livraison et retours", actif: (p: string) => p === "/boutique/aide" },
];

/** Barre de la boutique : rayons, suivi de commande, aide, et le panier. */
export default function NavBoutique() {
  const p = usePathname();
  const n = usePanier().reduce((s, l) => s + l.quantite, 0);
  return (
    <nav aria-label="Boutique" className="-mt-2 mb-8 flex items-center gap-1 overflow-x-auto defile-scroll border-b border-trait text-sm font-semibold">
      {LIENS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.actif(p) ? "page" : undefined}
          className={`shrink-0 px-3 py-3 -mb-px border-b-2 transition-colors ${l.actif(p) ? "border-vin text-vin" : "border-transparent text-sourdine hover:text-encre"}`}>{l.label}</Link>
      ))}
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("ar:panier-ouvrir"))}
        className="ml-auto shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-teinte">
        Panier
        <span className={`min-w-6 h-6 px-1.5 grid place-items-center rounded-full text-xs tnum ${n ? "bg-vin text-white" : "bg-teinte text-sourdine"}`}>{n}</span>
      </button>
    </nav>
  );
}
