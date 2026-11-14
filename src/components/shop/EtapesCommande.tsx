/** Où en est le client dans sa commande : panier, livraison, paiement, confirmation. */
const ETAPES = ["Panier", "Livraison", "Paiement", "Confirmation"];

export default function EtapesCommande({ actuelle }: { actuelle: 0 | 1 | 2 | 3 }) {
  return (
    <ol aria-label="Étapes de la commande" className="flex items-center gap-2 sm:gap-3 text-sm font-semibold mb-8 overflow-x-auto">
      {ETAPES.map((e, i) => (
        <li key={e} aria-current={i === actuelle ? "step" : undefined} className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className={`flex items-center gap-2 ${i === actuelle ? "text-encre" : i < actuelle ? "text-vin" : "text-sourdine"}`}>
            <span className={`w-7 h-7 grid place-items-center rounded-full text-xs tnum ${i === actuelle ? "bg-bordeaux text-white" : i < actuelle ? "bg-vin/15 text-vin" : "bg-teinte text-sourdine"}`}>{i < actuelle ? "✓" : i + 1}</span>
            <span className={i === actuelle ? "" : "hidden sm:inline"}>{e}</span>
          </span>
          {i < ETAPES.length - 1 && <span aria-hidden className={`w-6 sm:w-10 h-0.5 rounded-full ${i < actuelle ? "bg-vin/40" : "bg-trait"}`} />}
        </li>
      ))}
    </ol>
  );
}
