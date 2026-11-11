"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import TeamBadge from "@/components/TeamBadge";
import { simuler, victoiresNecessaires, type EquipeSim, type Force, type MatchSim, type Zones } from "@/lib/simulation";
import type { TeamLite } from "@/lib/types";

export type EquipeAffichee = EquipeSim & { team: TeamLite };

const fmt = (p: number) => (p <= 0 ? "–" : p < 0.01 ? "<1 %" : p > 0.99 && p < 1 ? ">99 %" : `${Math.round(p * 100)} %`);
const nom = (t: TeamLite) => t.short_name ?? t.name;

/** Chances de fin de saison, recalculées dans le navigateur à chaque scénario choisi. */
export type Historique = { team_id: string; jour: string; p_phase: number }[];

/** Scénario encodé dans l'adresse : « id:d,id:n,id:e » (8 premiers caractères de l'identifiant du match). */
const encoder = (f: Record<string, Force>) => Object.entries(f).map(([id, v]) => `${id.slice(0, 8)}:${v[0]}`).join(",");
const decoder = (s: string, matchs: MatchSim[]) => {
  const out: Record<string, Force> = {};
  for (const part of s.split(",")) {
    const [court, v] = part.split(":");
    const m = matchs.find((x) => x.id.startsWith(court));
    const f = v === "d" ? "dom" : v === "n" ? "nul" : v === "e" ? "ext" : null;
    if (m && f) out[m.id] = f;
  }
  return out;
};

export default function Simulateur({ equipes, matchs, zones, favori, supporter = false, historique = [] }: { equipes: EquipeAffichee[]; matchs: MatchSim[]; zones: Zones; favori?: string | null; supporter?: boolean; historique?: Historique }) {
  const [forces, setForces] = useState<Record<string, Force>>({});
  const [lien, setLien] = useState<string | null>(null);
  // scénario partagé (adresse ?scenario=…), ou le dernier enregistré sur cet appareil
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("scenario");
    let s = p;
    if (!s) try { s = localStorage.getItem(`scenario-${matchs[0]?.id ?? ""}`); } catch { /* indisponible */ }
    if (s) setForces(decoder(s, matchs));
  }, [matchs]);
  const [club, setClub] = useState<string>(favori && equipes.some((e) => e.id === favori) ? favori : equipes[0]?.id ?? "");
  const forcesDiff = useDeferredValue(forces);
  const calcul = useMemo(() => simuler(equipes, matchs, forcesDiff, zones), [equipes, matchs, forcesDiff, zones]);
  const enCours = forces !== forcesDiff;
  const N = equipes.length;
  const parId = new Map(equipes.map((e) => [e.id, e]));
  const lignes = [...equipes].sort((a, b) => calcul.rangMoyen[a.id] - calcul.rangMoyen[b.id]);

  const somme = (id: string, de: number, a: number) => calcul.places[id].slice(de - 1, a).reduce((s, x) => s + x, 0);
  const proba = (id: string) => ({
    top2: somme(id, 1, zones.qualif),
    phase: somme(id, 1, zones.barrage),
    acces: zones.acces ? calcul.places[id][zones.acces - 1] : 0,
    descente: somme(id, N - zones.descente + 1, N),
  });

  const journees = useMemo(() => {
    const g = new Map<string, MatchSim[]>();
    for (const m of matchs) g.set(m.journee ?? "À venir", [...(g.get(m.journee ?? "À venir") ?? []), m]);
    return [...g.entries()];
  }, [matchs]);
  const [ouvertes, setOuvertes] = useState(2);

  const choisi = parId.get(club);
  const pc = choisi ? proba(choisi.id) : null;
  const besoin = choisi ? victoiresNecessaires(calcul.victoires[choisi.id]) : null;
  const nbForces = Object.keys(forces).length;

  return (
    <div className="grid gap-8">
      {/* le club suivi */}
      {choisi && pc && (
        <section aria-label="Les chances de mon club" className="relative">
          <div aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-3xl bg-moutarde" />
          <div className="relative rounded-3xl bg-bordeaux text-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <TeamBadge team={choisi.team} size="md" />
              <label className="min-w-0">
                <span className="sr-only">Choisir un club</span>
                <select value={club} onChange={(e) => setClub(e.target.value)} className="bg-transparent groovy text-2xl sm:text-3xl text-white max-w-full cursor-pointer [&>option]:text-encre">
                  {equipes.map((e) => <option key={e.id} value={e.id}>{nom(e.team)}</option>)}
                </select>
              </label>
              <span className="ml-auto text-sm text-white/60">{choisi.points} pts après {choisi.joues} matchs · {calcul.restants[choisi.id]} à jouer</span>
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Chiffre label="Phase finale" valeur={pc.phase} fort />
              <Chiffre label="Demi-finale directe" valeur={pc.top2} />
              {zones.acces ? <Chiffre label="Match d'accession" valeur={pc.acces} alerte /> : null}
              <Chiffre label="Relégation" valeur={pc.descente} alerte />
              {!zones.acces && <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-white/60">Points projetés</p><p className="titre text-3xl font-extrabold tnum">{Math.round(calcul.pointsMoyens[choisi.id])}</p></div>}
            </div>
            <p className="mt-4 text-white/85">
              {pc.phase > 0.995 ? <>La phase finale est quasiment acquise.</>
                : besoin === null ? <>Même en gagnant tout, la qualification reste incertaine : il faudra aussi compter sur les autres.</>
                : besoin === 0 ? <>Déjà en position de force : la phase finale arrive 9 fois sur 10, quoi qu&apos;il arrive.</>
                : <>Avec <b className="text-moutarde">{besoin} victoire{besoin > 1 ? "s" : ""}</b> sur les {calcul.restants[choisi.id]} matchs restants, {nom(choisi.team)} se qualifie 9 fois sur 10.</>}
            </p>
          </div>
        </section>
      )}

      {supporter && choisi && historique.some((h) => h.team_id === choisi.id) && <Evolution points={historique.filter((h) => h.team_id === choisi.id)} nom={nom(choisi.team)} />}
      {!supporter && <p className="text-sm text-sourdine -mt-4">L&apos;évolution des chances jour après jour et le partage de scénarios sont réservés aux <a href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Supporters</a>.</p>}

      {/* tableau des probabilités */}
      <section aria-labelledby="h-proj">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <h2 id="h-proj" className="titre text-2xl font-extrabold">Classement projeté</h2>
          <p className="text-sm text-sourdine">{calcul.simulations.toLocaleString("fr-FR")} fins de saison simulées{nbForces ? `, avec ${nbForces} résultat${nbForces > 1 ? "s" : ""} imposé${nbForces > 1 ? "s" : ""}` : ""}.</p>
          {enCours && <span className="text-xs font-semibold text-vin animate-pulse">Calcul…</span>}
        </div>
        <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
          <table className="w-full text-sm tnum">
            <thead>
              <tr className="text-xs text-sourdine border-b border-trait">
                <th scope="col" className="text-left font-semibold py-2 pl-3">Club</th>
                <th scope="col" className="font-semibold px-2" title="Points projetés en fin de saison">Pts proj.</th>
                <th scope="col" className="font-semibold px-2">Top {zones.qualif}</th>
                <th scope="col" className="font-semibold px-2">Top {zones.barrage}</th>
                <th scope="col" className="font-semibold px-2">Relégation</th>
                <th scope="col" className="font-semibold px-3 text-left min-w-[220px]">Chances par place (1 → {N})</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((e) => {
                const p = proba(e.id);
                return (
                  <tr key={e.id} className={`border-b border-trait last:border-0 ${e.id === club ? "bg-teinte" : ""}`}>
                    <th scope="row" className="text-left font-semibold py-2 pl-3">
                      <button type="button" onClick={() => setClub(e.id)} className="flex items-center gap-2 text-left hover:text-vin">
                        <TeamBadge team={e.team} size="xs" /><span className="truncate max-w-[9rem]">{nom(e.team)}</span>
                      </button>
                    </th>
                    <td className="text-center px-2 font-semibold">{Math.round(calcul.pointsMoyens[e.id])}</td>
                    <td className="text-center px-2">{fmt(p.top2)}</td>
                    <td className="text-center px-2 font-bold">{fmt(p.phase)}</td>
                    <td className={`text-center px-2 ${p.descente >= 0.2 ? "text-alerte font-semibold" : ""}`}>{fmt(p.descente)}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-px" role="img" aria-label={`Place la plus probable : ${calcul.places[e.id].indexOf(Math.max(...calcul.places[e.id])) + 1}e`}>
                        {calcul.places[e.id].map((x, i) => {
                          const zone = i < zones.qualif ? "var(--vin)" : i < zones.barrage ? "var(--moutarde)" : i >= N - zones.descente ? "var(--alerte)" : "var(--sourdine)";
                          return <span key={i} title={`${i + 1}e : ${fmt(x)}`} className="h-5 flex-1 min-w-[10px] rounded-[3px]" style={{ background: zone, opacity: x < 0.005 ? 0.06 : 0.15 + Math.min(1, x * 1.6) * 0.85 }} />;
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-sourdine max-w-prose">
          Chaque match restant est rejoué à partir de l&apos;Indice Ambiance des deux clubs (avec l&apos;avantage du terrain), bonus offensifs et défensifs compris. Les égalités se départagent à la différence de points. C&apos;est une projection, pas une certitude : à vous de jouer les scénarios ci-dessous.
        </p>
      </section>

      {/* scénarios */}
      <section aria-labelledby="h-scen">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 id="h-scen" className="titre text-2xl font-extrabold">À vous de jouer</h2>
          <p className="text-sm text-sourdine flex-1">Imposez des résultats : les chances se recalculent aussitôt.</p>
          {nbForces > 0 && supporter && (
            <button type="button" className="bouton-or text-sm" onClick={async () => {
              const code = encoder(forces);
              try { localStorage.setItem(`scenario-${matchs[0]?.id ?? ""}`, code); } catch { /* indisponible */ }
              const url = `${location.origin}${location.pathname}?vue=simulateur&scenario=${encodeURIComponent(code)}`;
              try { if (navigator.share) await navigator.share({ title: "Mon scénario de fin de saison", url }); else { await navigator.clipboard.writeText(url); } setLien("Lien copié ✓"); } catch { setLien(url); }
            }}>{lien ?? "Enregistrer et partager mon scénario"}</button>
          )}
          {nbForces > 0 && !supporter && <a href="/abonnement" className="text-sm text-vin font-semibold underline underline-offset-4">Enregistrer et partager : réservé aux Supporters</a>}
          {nbForces > 0 && <button type="button" onClick={() => { setForces({}); setLien(null); }} className="bouton-discret text-sm">Tout remettre à zéro</button>}
        </div>
        <div className="grid gap-5">
          {journees.slice(0, ouvertes).map(([j, liste]) => (
            <div key={j}>
              <h3 className="font-bold mb-2">{/^\d+$/.test(j) ? `Journée ${j}` : j}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {liste.map((m) => {
                  const d = parId.get(m.dom), x = parId.get(m.ext);
                  if (!d || !x) return null;
                  const f = forces[m.id];
                  const choix = (v: Force) => setForces((s) => { const n = { ...s }; if (n[m.id] === v) delete n[m.id]; else n[m.id] = v; return n; });
                  return (
                    <li key={m.id} className="bg-surface border border-trait rounded-2xl p-2 flex items-center gap-1.5">
                      <Bouton actif={f === "dom"} onClick={() => choix("dom")} label={`Victoire de ${nom(d.team)}`}><TeamBadge team={d.team} size="xs" /><span className="truncate">{nom(d.team)}</span></Bouton>
                      <Bouton actif={f === "nul"} onClick={() => choix("nul")} label="Match nul" etroit>Nul</Bouton>
                      <Bouton actif={f === "ext"} onClick={() => choix("ext")} label={`Victoire de ${nom(x.team)}`}><span className="truncate">{nom(x.team)}</span><TeamBadge team={x.team} size="xs" /></Bouton>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {ouvertes < journees.length && (
          <button type="button" onClick={() => setOuvertes((n) => n + 3)} className="bouton-discret mt-4">Voir les journées suivantes</button>
        )}
      </section>
    </div>
  );
}

function Chiffre({ label, valeur, fort, alerte }: { label: string; valeur: number; fort?: boolean; alerte?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${fort ? "bg-moutarde text-bordeaux" : "bg-white/10"}`}>
      <p className={`text-xs ${fort ? "text-bordeaux/70" : "text-white/60"}`}>{label}</p>
      <p key={Math.round(valeur * 100)} className={`montant-pop titre text-3xl font-extrabold tnum ${alerte && valeur >= 0.2 ? "text-[#ff9a8f]" : ""}`}>{fmt(valeur)}</p>
    </div>
  );
}

function Bouton({ actif, onClick, label, etroit, children }: { actif: boolean; onClick: () => void; label: string; etroit?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif} aria-label={label}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold min-w-0 ${etroit ? "shrink-0 w-12" : "flex-1"} ${actif ? "bg-vin text-white" : "bg-teinte hover:bg-trait"}`}>
      {children}
    </button>
  );
}

/** Courbe des chances de phase finale, jour après jour. */
function Evolution({ points, nom }: { points: { jour: string; p_phase: number }[]; nom: string }) {
  const pts = [...points].sort((a, b) => a.jour.localeCompare(b.jour));
  if (pts.length < 2) return <p className="text-sm text-sourdine -mt-4">La courbe d&apos;évolution de {nom} apparaîtra dès demain.</p>;
  const W = 600, H = 120;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (p: number) => H - 8 - p * (H - 16);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.p_phase).toFixed(1)}`).join(" ");
  const fmtJ = (j: string) => new Date(`${j}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return (
    <section aria-label={`Évolution des chances de phase finale de ${nom}`} className="bg-surface border border-trait rounded-2xl p-4 -mt-2">
      <p className="text-sm font-bold">Chances de phase finale de {nom}, jour après jour</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" role="img" aria-label={`De ${Math.round(pts[0].p_phase * 100)} % le ${fmtJ(pts[0].jour)} à ${Math.round(pts[pts.length - 1].p_phase * 100)} % le ${fmtJ(pts[pts.length - 1].jour)}`}>
        <line x1={0} x2={W} y1={y(0.5)} y2={y(0.5)} stroke="var(--trait)" strokeDasharray="4 5" />
        <text x={W - 2} y={y(0.5) - 4} textAnchor="end" fontSize="11" fill="var(--sourdine)">50 %</text>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill="var(--vin)" fillOpacity={0.12} />
        <path d={d} fill="none" stroke="var(--vin)" strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].p_phase)} r={4} fill="var(--vin)" />
      </svg>
      <div className="flex justify-between text-xs text-sourdine"><span>{fmtJ(pts[0].jour)}</span><span className="font-bold text-encre">{Math.round(pts[pts.length - 1].p_phase * 100)} % aujourd&apos;hui</span></div>
    </section>
  );
}
