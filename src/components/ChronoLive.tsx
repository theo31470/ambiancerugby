"use client";
import { useEffect, useState } from "react";

/**
 * Chrono du direct qui tourne à la seconde. Part de la dernière minute connue (feuille ESPN) ;
 * à défaut, l'estime depuis le coup d'envoi (mi-temps de 15 minutes environ).
 */
export default function ChronoLive({ kickoff, clock, updatedAt, status }: { kickoff: string; clock: string | null; updatedAt: string | null; status: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (status === "halftime") return <>Mi-temps</>;
  if (now == null) return <>{clock ?? "En direct"}</>;
  const minuteConnue = clock?.match(/^(\d+)/)?.[1];
  const deuxieme = /2e|2nd|second/i.test(clock ?? "");
  let s: number;
  if (minuteConnue && updatedAt) s = Number(minuteConnue) * 60 + Math.max(0, (now - new Date(updatedAt).getTime()) / 1000);
  else if (deuxieme) s = 40 * 60 + Math.max(0, (now - new Date(kickoff).getTime()) / 1000 - 55 * 60);
  else s = Math.max(0, (now - new Date(kickoff).getTime()) / 1000);
  const premiere = !deuxieme && (!minuteConnue || Number(minuteConnue) <= 40);
  const plafond = premiere ? 40 * 60 : 80 * 60;
  if (s >= plafond) return <>{plafond / 60}&apos;+</>;
  const mm = Math.floor(s / 60), ss = Math.floor(s % 60);
  return <span className="tnum">{mm}:{String(ss).padStart(2, "0")}</span>;
}
