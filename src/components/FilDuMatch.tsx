"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EVENT_LABEL, EVENT_POINTS } from "@/lib/format";
import { phraseAction } from "@/lib/commentaires";
import ChronoLive, { type Periodes } from "./ChronoLive";

type Evt = { id: string; minute: number | null; kind: string; text: string | null; team_id: string | null; player: unknown };
type Equipe = { id: string; name: string; short_name: string | null };
type Joueur = { slug: string; first_name: string; last_name: string } | null;
const PICTO: Record<string, string> = { try: "🏉", penalty_try: "🏉", conversion: "🎯", penalty: "🎯", drop: "🦶", yellow: "🟨", red: "🟥", sub: "🔁", note: "📣" };
const FILTRES = [
  { id: "tout", label: "Tout", garde: () => true },
  { id: "points", label: "Points", garde: (k: string) => (EVENT_POINTS[k] ?? 0) > 0 },
  { id: "cartons", label: "Cartons", garde: (k: string) => k === "yellow" || k === "red" },
  { id: "changements", label: "Remplacements", garde: (k: string) => k === "sub" },
] as const;

type Ligne = { e: Evt; sh: number; sa: number; pts: number; domicile: boolean };
type Element = { type: "fait"; l: Ligne } | { type: "jalon"; cle: string; titre: string; score?: string };

/**
 * Le fil du match façon « match center » : une ligne de temps au centre, les faits de l'équipe qui reçoit à gauche,
 * ceux des visiteurs à droite, des jalons (coup d'envoi, mi-temps, fin) avec le score. En direct, le plus récent en haut.
 */
export default function FilDuMatch({ events, home, away, live, clock, kickoff, updatedAt, status, periodes }: { events: Evt[]; home: Equipe; away: Equipe; live: boolean; clock: string | null; kickoff: string; updatedAt: string | null; status: string; periodes?: Periodes }) {
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["id"]>("tout");
  const nom = (t: Equipe) => t.short_name ?? t.name;

  const lignes = useMemo(() => events.reduce<Ligne[]>((acc, e) => {
    const pts = EVENT_POINTS[e.kind] ?? 0;
    const p = acc[acc.length - 1] ?? { sh: 0, sa: 0 };
    acc.push({ e, pts, domicile: e.team_id !== away.id, sh: p.sh + (e.team_id === home.id ? pts : 0), sa: p.sa + (e.team_id === away.id ? pts : 0) });
    return acc;
  }, []), [events, home.id, away.id]);

  const elements = useMemo(() => {
    const garde = FILTRES.find((f) => f.id === filtre)!.garde;
    const mi = lignes.filter((l) => (l.e.minute ?? 0) <= 40).at(-1) ?? { sh: 0, sa: 0 };
    const fin = lignes.at(-1) ?? { sh: 0, sa: 0 };
    const deuxieme = lignes.some((l) => (l.e.minute ?? 0) > 40) || status === "finished" || status === "halftime";
    const out: Element[] = [{ type: "jalon", cle: "ke", titre: "Coup d'envoi" }];
    let miPose = false;
    for (const l of lignes) {
      if (!miPose && (l.e.minute ?? 0) > 40) { out.push({ type: "jalon", cle: "mt", titre: "Mi-temps", score: `${mi.sh} – ${mi.sa}` }); miPose = true; }
      if (garde(l.e.kind)) out.push({ type: "fait", l });
    }
    if (!miPose && deuxieme) out.push({ type: "jalon", cle: "mt", titre: "Mi-temps", score: `${mi.sh} – ${mi.sa}` });
    if (status === "finished") out.push({ type: "jalon", cle: "ft", titre: "Fin du match", score: `${fin.sh} – ${fin.sa}` });
    return live ? out.reverse() : out;
  }, [lignes, filtre, live, status]);

  const carte = (l: Ligne) => {
    const p = l.e.player as Joueur;
    const marque = l.pts > 0;
    const libelle = l.e.kind === "sub" ? l.e.text ?? EVENT_LABEL.sub : `${p ? "" : `${l.e.text ?? ""} `}${EVENT_LABEL[l.e.kind] ?? l.e.kind}`.trim();
    const phrase = l.e.kind === "note" ? l.e.text : phraseAction(l.e.kind, l.e.id, p ? `${p.first_name} ${p.last_name}` : null, nom(l.domicile ? home : away));
    const fond = l.e.kind === "red" ? "border-alerte/50 bg-alerte/5" : l.e.kind === "yellow" ? "border-moutarde/60 bg-moutarde/10" : marque ? "border-vin/30 bg-surface shadow-sm" : "border-trait bg-surface";
    return (
      <div className={`fil-carte rounded-2xl border px-4 py-3 ${fond} ${l.domicile ? "sm:text-right" : ""}`}>
        <div className={`flex items-center gap-2 flex-wrap ${l.domicile ? "sm:flex-row-reverse" : ""}`}>
          <span aria-hidden className={marque ? "text-xl" : "text-base"}>{PICTO[l.e.kind] ?? "•"}</span>
          <span className={`titre font-bold ${marque ? "text-vin" : "text-sm text-sourdine"}`}>{libelle}</span>
          {marque && <span className="rounded-full bg-bordeaux text-white titre font-extrabold tnum text-sm px-2.5 py-0.5">{l.sh} – {l.sa}</span>}
          <span className="sm:hidden ml-auto text-xs text-sourdine">{nom(l.domicile ? home : away)}</span>
        </div>
        {p && l.e.kind !== "sub" && (
          <Link href={`/joueurs/${p.slug}`} className={`mt-1 block font-semibold hover:text-vin ${marque ? "text-lg" : ""}`}>{p.first_name} {p.last_name}</Link>
        )}
        {phrase && <p className="mt-1 text-sm italic text-sourdine">{phrase}</p>}
      </div>
    );
  };

  return (
    <section aria-labelledby="h-faits" className="mt-10 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="h-faits" className="groovy text-2xl text-vin">Le fil du match</h2>
        {live && <p className="inline-flex items-center gap-2 rounded-full bg-alerte text-white px-3 py-1 text-sm font-bold tnum"><span className="pastille" aria-hidden /><ChronoLive kickoff={kickoff} clock={clock} updatedAt={updatedAt} status={status} periodes={periodes} /></p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div role="group" aria-label="Filtrer le fil" className="flex flex-wrap gap-1.5 text-sm font-semibold">
          {FILTRES.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}
              className={`rounded-full px-3 py-1 border transition-colors ${filtre === f.id ? "bg-bordeaux text-white border-bordeaux" : "border-trait text-sourdine hover:text-encre"}`}>{f.label}</button>
          ))}
        </div>
        {live && <p className="text-xs text-sourdine">Le plus récent en haut</p>}
      </div>

      {/* en-tête des deux camps (grand écran) */}
      <div className="hidden sm:grid grid-cols-[1fr_4rem_1fr] text-sm font-bold text-sourdine mb-2">
        <span className="text-right">{nom(home)}</span><span /><span>{nom(away)}</span>
      </div>

      <ol className="relative">
        <span aria-hidden className="absolute top-0 bottom-0 left-6 sm:left-1/2 w-0.5 -translate-x-1/2 bg-trait" />
        {elements.map((x) => x.type === "jalon" ? (
          <li key={x.cle} className="relative flex sm:justify-center py-3 pl-12 sm:pl-0">
            <span className="relative z-10 inline-flex items-center gap-3 rounded-full bg-bordeaux text-white px-4 py-1.5 text-sm font-bold">
              {x.titre}{x.score && <span className="tnum text-moutarde">{x.score}</span>}
            </span>
          </li>
        ) : (
          <li key={x.l.e.id} className="relative grid grid-cols-[3rem_1fr] sm:grid-cols-[1fr_4rem_1fr] items-center gap-0 py-2 fil-entree">
            <div className="hidden sm:block pr-3 sm:col-start-1 row-start-1">{x.l.domicile && carte(x.l)}</div>
            <span className={`relative z-10 justify-self-center sm:col-start-2 row-start-1 grid place-items-center w-11 h-11 rounded-full titre font-extrabold tnum text-sm border-2 ${x.l.pts > 0 ? "bg-moutarde text-bordeaux border-moutarde" : "bg-surface text-vin border-trait"}`}>
              {x.l.e.minute != null ? `${x.l.e.minute}'` : "·"}
            </span>
            <div className="sm:hidden col-start-2 row-start-1 pl-2">{carte(x.l)}</div>
            <div className="hidden sm:block pl-3 sm:col-start-3 row-start-1">{!x.l.domicile && carte(x.l)}</div>
          </li>
        ))}
      </ol>
      {elements.every((x) => x.type === "jalon") && <p className="mt-3 text-sm text-sourdine">Rien dans cette catégorie pour l&apos;instant.</p>}
    </section>
  );
}
