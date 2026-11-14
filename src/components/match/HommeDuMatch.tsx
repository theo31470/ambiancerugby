/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

type Joueur = { slug: string; first_name: string; last_name: string; photo_url?: string | null };
export type Hdm = { joueur: Joueur; equipe: string; note: number | null; s: Record<string, number>; officiel: boolean };

const CHIFFRES: [string, (v: number) => string][] = [
  ["tries", (v) => `${v} essai${v > 1 ? "s" : ""}`], ["try_assists", (v) => `${v} passe${v > 1 ? "s" : ""} décisive${v > 1 ? "s" : ""}`],
  ["line_breaks", (v) => `${v} franchissement${v > 1 ? "s" : ""}`], ["defenders_beaten", (v) => `${v} défenseur${v > 1 ? "s" : ""} battu${v > 1 ? "s" : ""}`],
  ["metres", (v) => `${v} m gagnés`], ["turnovers_won", (v) => `${v} ballon${v > 1 ? "s" : ""} gratté${v > 1 ? "s" : ""}`],
  ["tackles", (v) => `${v} plaquages`], ["kick_metres", (v) => `${v} m au pied`], ["points", (v) => `${v} points`],
];

/** L'homme du match en grand : portrait, note, ses chiffres marquants ; à côté, le choix des Supporters s'il diffère. */
export default function HommeDuMatch({ h, sup }: { h: Hdm; sup?: { joueur: Joueur; note: number; votes: number } | null }) {
  const seuils: Record<string, number> = { tackles: 10, metres: 40, kick_metres: 200, points: 10 };
  const faits = CHIFFRES.filter(([k]) => (h.s[k] ?? 0) >= (seuils[k] ?? 1)).slice(0, 4);
  return (
    <section aria-labelledby="h-hdm" className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
      <div className="relative overflow-hidden rounded-2xl bg-bordeaux text-white p-5 sm:p-6 flex gap-5 items-end apparition-hdm">
        <div className="relative w-20 sm:w-36 shrink-0 self-stretch">
          {h.joueur.photo_url
            ? <img src={h.joueur.photo_url} alt="" className="absolute bottom-0 left-0 w-full h-[120%] object-contain object-bottom" />
            : <span className="absolute inset-x-0 bottom-0 aspect-square rounded-full bg-white/10 grid place-items-center groovy text-5xl text-moutarde">{h.joueur.first_name[0]}{h.joueur.last_name[0]}</span>}
        </div>
        <div className="min-w-0 py-1 pr-14 sm:pr-20">
          <h2 id="h-hdm" className="text-sm font-semibold text-moutarde">⭐ Homme du match</h2>
          <p className="groovy text-2xl sm:text-4xl leading-none mt-1">
            <Link href={`/joueurs/${h.joueur.slug}`} className="hover:underline underline-offset-4">{h.joueur.first_name} {h.joueur.last_name}</Link>
          </p>
          <p className="text-sm text-white/70 mt-1">{h.equipe} · {h.officiel ? "désigné officiellement" : "désigné par l'algorithme"}</p>
          {faits.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5 text-sm">
              {faits.map(([k, f]) => <li key={k} className="rounded-full bg-white/10 px-2.5 py-0.5 tnum">{f(h.s[k])}</li>)}
            </ul>
          )}
        </div>
        {h.note != null && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-moutarde text-bordeaux grid place-items-center rotate-[-6deg]">
            <span className="groovy text-xl sm:text-2xl tnum leading-none">{h.note.toFixed(1)}</span>
          </div>
        )}
      </div>
      {sup && sup.joueur.slug !== h.joueur.slug && (
        <div className="rounded-2xl bg-surface border border-trait p-5 md:w-64 flex flex-col justify-center">
          <p className="text-sm text-sourdine">Le choix des Supporters</p>
          <Link href={`/joueurs/${sup.joueur.slug}`} className="titre font-bold text-xl mt-1 hover:text-vin">{sup.joueur.first_name} {sup.joueur.last_name}</Link>
          <p className="text-sm text-sourdine mt-1 tnum">{sup.note.toFixed(1)}/10 · {sup.votes} vote{sup.votes > 1 ? "s" : ""}</p>
        </div>
      )}
    </section>
  );
}
