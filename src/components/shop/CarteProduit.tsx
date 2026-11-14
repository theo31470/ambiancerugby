/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { couleursDe, prixDe, type Produit } from "@/lib/shop/catalogue";
import { fondPastille } from "@/lib/shop/couleurs";
import { euros } from "@/lib/shop/format";

/** Vignette d'un article : deux photos (la seconde au survol), prix, couleurs disponibles. */
export default function CarteProduit({ p, priorite = false }: { p: Produit; priorite?: boolean }) {
  const couleurs = couleursDe(p);
  const { min, varie } = prixDe(p);
  return (
    <Link href={`/boutique/${p.slug}`} className="group block focus-visible:outline-offset-4">
      <div className="relative aspect-[4/5] rounded-2xl bg-teinte overflow-hidden">
        {p.images[0] && <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" loading={priorite ? "eager" : "lazy"} />}
        {p.images[1] && <img src={p.images[1]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" loading="lazy" />}
        {p.featured && <span className="absolute top-3 left-3 text-xs font-bold rounded-full bg-moutarde text-bordeaux px-2.5 py-1">Nouveau</span>}
        <span className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 rounded-full bg-surface/95 text-encre text-sm font-semibold text-center py-2 shadow-sm motion-reduce:transition-none">
          Voir l&apos;article
        </span>
      </div>
      <p className="mt-3 font-semibold leading-snug">{p.name}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="tnum">{varie && <span className="text-sm text-sourdine">dès </span>}<span className="titre font-extrabold text-lg">{euros(min)}</span></span>
        {couleurs.length > 1 && (
          <span className="flex items-center -space-x-1" aria-label={`${couleurs.length} couleurs`}>
            {couleurs.slice(0, 5).map(([nom, hex]) => <span key={nom} title={nom} className="w-4 h-4 rounded-full border-2 border-fond" style={{ background: fondPastille(hex) }} />)}
            {couleurs.length > 5 && <span className="pl-2 text-xs font-semibold text-sourdine tnum">+{couleurs.length - 5}</span>}
          </span>
        )}
      </div>
    </Link>
  );
}
