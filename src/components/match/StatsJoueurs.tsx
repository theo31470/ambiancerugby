"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import VoteNote from "@/components/notes/VoteNote";

export type JoueurMatch = {
  id: string; slug: string; prenom: string; nom: string; cote: "h" | "a"; numero: number | null; titulaire: boolean;
  note: number | null; hdm: boolean; sup: { note: number; votes: number } | null; monVote: number | null;
  s: Record<string, number>;
};
type Col = { cle: string; court: string; long: string; calc?: (s: Record<string, number>) => number | null; format?: (v: number) => string };
type Vue = { id: string; label: string; cols: Col[]; tri: string };

const pct = (s: Record<string, number>) => (s.tackles + s.missed_tackles > 0 ? Math.round((100 * s.tackles) / (s.tackles + s.missed_tackles)) : null);
const VUES: Vue[] = [
  { id: "notes", label: "Notes", tri: "note", cols: [
    { cle: "minutes", court: "Min", long: "Minutes jouées" }, { cle: "tries", court: "Essais", long: "Essais" }, { cle: "points", court: "Pts", long: "Points" },
  ] },
  { id: "attaque", label: "Ballon en main", tri: "metres", cols: [
    { cle: "carries", court: "Courses", long: "Courses" }, { cle: "metres", court: "Mètres", long: "Mètres gagnés" },
    { cle: "line_breaks", court: "Franch.", long: "Franchissements" }, { cle: "defenders_beaten", court: "Déf. battus", long: "Défenseurs battus" },
    { cle: "offloads", court: "PAC", long: "Passes après contact" }, { cle: "try_assists", court: "Passes déc.", long: "Passes décisives" }, { cle: "passes", court: "Passes", long: "Passes" },
  ] },
  { id: "defense", label: "Défense", tri: "tackles", cols: [
    { cle: "tackles", court: "Plaquages", long: "Plaquages réussis" }, { cle: "missed_tackles", court: "Manqués", long: "Plaquages manqués" },
    { cle: "reussite", court: "Réussite", long: "Réussite au plaquage", calc: pct, format: (v) => `${v} %` },
    { cle: "dominant_tackles", court: "Dominants", long: "Plaquages dominants" }, { cle: "turnovers_won", court: "Grattés", long: "Ballons grattés" },
    { cle: "lineouts_stolen", court: "Touches volées", long: "Touches volées" },
  ] },
  { id: "pied", label: "Jeu au pied", tri: "kick_metres", cols: [
    { cle: "kicks", court: "Coups de pied", long: "Coups de pied" }, { cle: "kick_metres", court: "Mètres", long: "Mètres au pied" },
    { cle: "buts", court: "Pts au pied", long: "Points au pied (transformations, pénalités, drops)", calc: (s) => s.points - 5 * s.tries || null },
  ] },
  { id: "discipline", label: "Discipline", tri: "penalties_conceded", cols: [
    { cle: "penalties_conceded", court: "Pén. concédées", long: "Pénalités concédées" }, { cle: "turnovers_conceded", court: "Ballons perdus", long: "Ballons perdus" },
    { cle: "handling_errors", court: "En-avant", long: "En-avant et fautes de main" },
    { cle: "cartons", court: "Cartons", long: "Cartons", calc: (s) => (s.yellow || 0) + 2 * (s.red || 0) || null },
  ] },
];

const POSTE: Record<number, string> = { 1: "Pilier", 2: "Talonneur", 3: "Pilier", 4: "2e ligne", 5: "2e ligne", 6: "3e ligne", 7: "3e ligne", 8: "N° 8", 9: "Mêlée", 10: "Ouverture", 11: "Ailier", 12: "Centre", 13: "Centre", 14: "Ailier", 15: "Arrière" };

/**
 * Les joueurs du match par thème (notes, ballon en main, défense, jeu au pied, discipline) au lieu d'un tableau
 * à vingt colonnes : quelques colonnes à la fois, tri au clic, filtre par équipe. Les Supporters voient tout.
 */
export default function StatsJoueurs({ joueurs, dom, ext, full, fini, matchId }: { joueurs: JoueurMatch[]; dom: string; ext: string; full: boolean; fini: boolean; matchId: string }) {
  const vues = useMemo(() => VUES.filter((v) => v.id === "notes" || joueurs.some((j) => v.cols.some((c) => (c.calc ? c.calc(j.s) : j.s[c.cle]) ))), [joueurs]);
  const [vue, setVue] = useState("notes");
  const [equipe, setEquipe] = useState<"tous" | "h" | "a">("tous");
  const [tri, setTri] = useState<{ cle: string; desc: boolean } | null>(null);
  const v = vues.find((x) => x.id === vue) ?? vues[0];
  const triCle = tri?.cle ?? v.tri;
  const val = (j: JoueurMatch, cle: string) => {
    if (cle === "note") return j.note ?? -1;
    if (cle === "sup") return j.sup?.note ?? -1;
    if (cle === "numero") return j.numero ?? 99;
    const c = v.cols.find((x) => x.cle === cle);
    return (c?.calc ? c.calc(j.s) : j.s[cle]) ?? -1;
  };
  const liste = joueurs.filter((j) => equipe === "tous" || j.cote === equipe)
    .sort((a, b) => (tri?.desc === false ? 1 : -1) * (val(a, triCle) - val(b, triCle)) || (b.note ?? 0) - (a.note ?? 0));
  const visibles = full ? liste : liste.slice(0, 3);
  const trier = (cle: string) => setTri((t) => ({ cle, desc: t?.cle === cle ? !t.desc : cle !== "numero" }));
  const entete = (cle: string, court: string, long: string, cls = "") => (
    <th scope="col" className={`px-2 py-2.5 font-semibold whitespace-nowrap ${cls}`} aria-sort={triCle === cle ? (tri?.desc === false ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => trier(cle)} title={long} className={`inline-flex items-center gap-1 hover:text-vin ${triCle === cle ? "text-vin" : ""}`}>
        {court}<span aria-hidden className="text-[10px]">{triCle === cle ? (tri?.desc === false ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div role="group" aria-label="Thème" className="flex flex-wrap gap-1">
          {vues.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === v.id} onClick={() => { setVue(x.id); setTri(null); }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${x.id === v.id ? "bg-vin text-white" : "bg-teinte hover:bg-trait"}`}>{x.label}</button>
          ))}
        </div>
        <div role="group" aria-label="Équipe" className="flex rounded-full bg-teinte p-1 text-sm font-semibold">
          {([["tous", "Tous"], ["h", dom], ["a", ext]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={equipe === k} onClick={() => setEquipe(k)}
              className={`rounded-full px-3 py-1 max-w-36 truncate ${equipe === k ? "bg-surface shadow-sm" : "text-sourdine"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="relative bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table key={v.id + equipe} className="w-full text-sm tnum onglet-entree">
          <caption className="sr-only">Joueurs, {v.label.toLowerCase()}</caption>
          <thead>
            <tr className="text-xs text-sourdine border-b border-trait">
              <th scope="col" className="sticky left-0 bg-surface text-left font-semibold py-2.5 pl-4 pr-2">Joueur</th>
              {v.id === "notes" && entete("note", "Note", "Note Ambiance Rugby")}
              {v.id === "notes" && fini && entete("sup", "Supporters", "Note moyenne des Supporters")}
              {v.cols.map((c) => entete(c.cle, c.court, c.long, "text-center"))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((j, i) => (
              <tr key={j.id} className="border-b border-trait last:border-0 hover:bg-teinte/50">
                <th scope="row" className="sticky left-0 bg-surface text-left font-normal py-2 pl-4 pr-2 min-w-44">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={`w-1 self-stretch rounded-full ${j.cote === "h" ? "bg-vin" : "bg-moutarde"}`} />
                    <span className="min-w-0">
                      <Link href={`/joueurs/${j.slug}`} className="font-semibold hover:text-vin block truncate">
                        {j.prenom.slice(0, 1)}. {j.nom}{j.hdm && <span className="ml-1" title="Homme du match">⭐</span>}
                      </Link>
                      <span className="text-xs text-sourdine">{j.cote === "h" ? dom : ext}{j.numero ? ` · ${j.numero <= 15 ? POSTE[j.numero] : `n° ${j.numero}`}` : ""}</span>
                    </span>
                  </span>
                </th>
                {v.id === "notes" && (
                  <td className="px-2 text-center">
                    {j.note == null ? <span className="text-sourdine">…</span>
                      : <span className={`inline-block min-w-11 rounded-full px-2 py-0.5 titre font-extrabold ${j.note >= 8 ? "bg-moutarde text-bordeaux" : j.note >= 6.5 ? "bg-teinte" : "bg-alerte/10 text-alerte"}`}>{j.note.toFixed(1)}</span>}
                  </td>
                )}
                {v.id === "notes" && fini && (
                  <td className="px-2 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className="titre font-extrabold" title={j.sup ? `${j.sup.votes} vote(s)` : "Pas encore de vote"}>{j.sup?.note.toFixed(1) ?? "–"}</span>
                      {full && <VoteNote matchId={matchId} playerId={j.id} initial={j.monVote} nom={`${j.prenom} ${j.nom}`} />}
                    </span>
                  </td>
                )}
                {v.cols.map((c) => {
                  const x = c.calc ? c.calc(j.s) : j.s[c.cle];
                  const meilleur = !!x && triCle === c.cle && i === 0 && (tri?.desc ?? true);
                  return (
                    <td key={c.cle} className={`px-2 text-center ${meilleur ? "font-extrabold text-vin" : ""}`}>
                      {c.cle === "cartons" ? `${"🟨".repeat(j.s.yellow || 0)}${"🟥".repeat(j.s.red || 0)}` || "–" : x ? (c.format ? c.format(x) : x) : <span className="text-sourdine">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!full && liste.length > 3 && (
          <div className="border-t border-trait">
            <div aria-hidden className="blur-sm select-none pointer-events-none opacity-50 px-4 py-3 grid gap-2">
              {[0, 1, 2].map((k) => <div key={k} className="h-7 rounded bg-teinte" />)}
            </div>
            <p className="px-4 pb-4 -mt-16 relative text-center text-sm font-semibold">
              Les {liste.length - 3} autres joueurs, toutes les stats et le vote des notes sont réservés aux Supporters.{" "}
              <Link href="/abonnement" className="text-vin underline underline-offset-4">Devenir Supporter</Link>
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-sourdine">Cliquez sur un intitulé pour trier. Données World Rugby (Opta) et feuilles de match LNR.</p>
    </div>
  );
}
