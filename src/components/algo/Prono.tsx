import Link from "next/link";
import { pct, type Prono as P } from "@/lib/algo";

/** Barre de pronostic : victoire domicile / nul / victoire extérieur. */
export default function Prono({ p, home, away, detail = true, verrou = false }: { p: P; home: string; away: string; detail?: boolean; verrou?: boolean }) {
  if (verrou) {
    const fav = p.favori === "home" ? home : p.favori === "away" ? away : null;
    return (
      <div className="rounded-xl border border-dashed border-vin/40 p-4 text-sm">
        <p><span className="font-semibold">Pronostic Ambiance :</span> {fav ? <>{fav} part favori.</> : <>match très serré.</>}</p>
        <p className="mt-1 text-sourdine">
          Les pourcentages et l&apos;écart estimé sont réservés aux Supporters.{" "}
          <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link>
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden" role="img" aria-label={`Pronostic : ${home} ${pct(p.home)}, nul ${pct(p.draw)}, ${away} ${pct(p.away)}`}>
        <span className="bg-vin" style={{ width: `${p.home * 100}%` }} />
        <span className="bg-sourdine/40" style={{ width: `${p.draw * 100}%` }} />
        <span className="bg-moutarde" style={{ width: `${p.away * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-sm tnum">
        <span><span className="font-bold titre">{pct(p.home)}</span> {home}</span>
        <span className="text-sourdine">nul {pct(p.draw)}</span>
        <span>{away} <span className="font-bold titre">{pct(p.away)}</span></span>
      </div>
      {detail && p.favori && (
        <p className="mt-1.5 text-xs text-sourdine">Écart estimé : environ {p.margin} point{p.margin > 1 ? "s" : ""} en faveur de {p.favori === "home" ? home : away}.</p>
      )}
    </div>
  );
}
