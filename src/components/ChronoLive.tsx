"use client";
import { useEffect, useState } from "react";

/**
 * Chrono du direct qui tourne à la seconde. Part de la dernière minute connue (feuille ESPN) ;
 * à défaut, l'estime depuis le coup d'envoi (mi-temps de 15 minutes environ).
 */
export type Periodes = { periode1_debut?: string | null; periode1_fin?: string | null; periode2_debut?: string | null; periode2_fin?: string | null };

export default function ChronoLive({ kickoff, clock, updatedAt, status, periodes }: { kickoff: string; clock: string | null; updatedAt: string | null; status: string; periodes?: Periodes }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const p = periodes ?? {};
  // heures exactes de la feuille LNR : début et fin de chaque mi-temps
  if (p.periode2_fin) return <>Terminé</>;
  if (p.periode1_fin && !p.periode2_debut) return <>Mi-temps</>;
  if (status === "halftime" && !p.periode1_debut) return <>Mi-temps</>;
  if (now == null) return <>{clock ?? "En direct"}</>;
  if (p.periode1_debut) {
    const depuis = (d: string) => Math.max(0, (now - new Date(d).getTime()) / 1000);
    const enSeconde = !!p.periode2_debut;
    const s = enSeconde ? 40 * 60 + depuis(p.periode2_debut!) : depuis(p.periode1_debut);
    const plafond = enSeconde ? 80 * 60 : 40 * 60;
    if (s >= plafond) return <span className="tnum">{plafond / 60}&apos;+{Math.floor((s - plafond) / 60)}</span>;
    return <span className="tnum">{Math.floor(s / 60)}:{String(Math.floor(s % 60)).padStart(2, "0")}</span>;
  }
  const minuteConnue = clock?.match(/^(\d+)/)?.[1];
  const deuxieme = /2e|2nd|second/i.test(clock ?? "");
  let s: number;
  const secondes = Number(clock?.match(/^\d+:(\d{2})/)?.[1] ?? 0);
  if (minuteConnue && updatedAt) s = Number(minuteConnue) * 60 + secondes + Math.max(0, (now - new Date(updatedAt).getTime()) / 1000);
  else if (deuxieme) s = 40 * 60 + Math.max(0, (now - new Date(kickoff).getTime()) / 1000 - 55 * 60);
  else s = Math.max(0, (now - new Date(kickoff).getTime()) / 1000);
  const premiere = !deuxieme && (!minuteConnue || Number(minuteConnue) <= 40);
  const plafond = premiere ? 40 * 60 : 80 * 60;
  if (s >= plafond) return <>{plafond / 60}&apos;+</>;
  const mm = Math.floor(s / 60), ss = Math.floor(s % 60);
  return <span className="tnum">{mm}:{String(ss).padStart(2, "0")}</span>;
}
