import { euros } from "@/lib/shop/format";

/** « Plus que 12 € pour la livraison offerte » : la jauge avance avec le panier. */
export default function JaugeLivraison({ sousTotal, seuil }: { sousTotal: number; seuil: number | null }) {
  if (!seuil) return null;
  const reste = Math.max(0, seuil - sousTotal);
  const part = Math.min(100, (sousTotal / seuil) * 100);
  return (
    <div className="rounded-xl bg-teinte px-3 py-2.5">
      <p className="text-sm">
        {reste > 0 ? <>Plus que <strong className="tnum">{euros(reste)}</strong> pour la <strong>livraison offerte</strong></> : <><strong>Livraison offerte</strong> sur cette commande</>}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(part)} aria-label="Progression vers la livraison offerte">
        <div className={`h-full rounded-full transition-[width] duration-500 ${reste > 0 ? "bg-or" : "bg-ok"}`} style={{ width: `${part}%` }} />
      </div>
    </div>
  );
}
