/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LIGNES_XV, POSTES_XV, type Candidat } from "@/lib/xv-commun";

/** Un XV posé sur le terrain, des avants aux arrières. */
export default function TerrainXV({ xv }: { xv: Record<number, Candidat> }) {
  const total = Object.values(xv).reduce((s, c) => s + (c.note ?? 0), 0);
  return (
    <div className="terrain-xv rounded-3xl p-3 sm:p-5 text-white">
      <div className="grid gap-3">
        {LIGNES_XV.map((ligne, i) => (
          <div key={i} className="flex justify-center gap-2 sm:gap-4">
            {ligne.map((n) => {
              const c = xv[n];
              return (
                <div key={n} className="w-[72px] sm:w-20 text-center">
                  {c ? (
                    <Link href={`/joueurs/${c.slug}`} className="block group">
                      {c.photo ? <img src={c.photo} alt="" loading="lazy" className="mx-auto w-11 h-11 rounded-full object-cover object-top bg-white/20 ring-2 ring-white/70 group-hover:ring-moutarde" />
                        : <span className="mx-auto grid place-items-center w-11 h-11 rounded-full bg-white/20 ring-2 ring-white/70 titre font-extrabold">{n}</span>}
                      <span className="mt-1 block text-[11px] font-bold leading-tight truncate">{c.nom.split(" ").slice(-1)[0]}</span>
                      <span className="block text-[10px] text-white/75 truncate">{c.club}{c.note != null ? ` · ${c.note.toFixed(1)}` : ""}</span>
                    </Link>
                  ) : (
                    <span className="block"><span className="mx-auto grid place-items-center w-11 h-11 rounded-full border-2 border-dashed border-white/50 titre font-extrabold">{n}</span><span className="mt-1 block text-[10px] text-white/70">{POSTES_XV[n]}</span></span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {total > 0 && <p className="mt-4 text-center text-sm font-bold">Total des notes : <span className="text-moutarde tnum">{total.toFixed(1)}</span></p>}
    </div>
  );
}
