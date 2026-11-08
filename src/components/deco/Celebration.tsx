"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Ballon, Poteaux } from "./Icones";

type Fete = { id: number; titre: string; detail: string };
const COULEURS = ["#f2b53a", "#934f5e", "#ffffff", "#3e1621", "#f6e4e8"];

/**
 * Quand un score bondit de 5 points ou plus en direct (un essai), le site fait la fête :
 * ballon entre les poteaux, « ESSAI ! » géant et confettis. Une fois toutes les 20 s maximum.
 */
export default function Celebration() {
  const [fete, setFete] = useState<Fete | null>(null);
  const dernier = useRef(0);
  const scores = useRef(new Map<string, [number, number]>());

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel("celebration")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, async (payload: { new: unknown; old: unknown }) => {
        const m = payload.new as { id: string; status: string; home_score: number | null; away_score: number | null; home_team_id: string; away_team_id: string };
        const old = payload.old as { home_score?: number | null; away_score?: number | null } | null;
        const avant: [number, number] | undefined =
          scores.current.get(m.id) ?? (old && "home_score" in old ? [old.home_score ?? 0, old.away_score ?? 0] : undefined);
        const apres: [number, number] = [m.home_score ?? 0, m.away_score ?? 0];
        scores.current.set(m.id, apres);
        if (!avant || (m.status !== "live" && m.status !== "halftime")) return;
        const cote = apres[0] - avant[0] >= 5 ? "home" : apres[1] - avant[1] >= 5 ? "away" : null;
        if (!cote || Date.now() - dernier.current < 20000) return;
        dernier.current = Date.now();
        const { data } = await supabase.from("teams").select("id,short_name,name").in("id", [m.home_team_id, m.away_team_id]);
        const nom = (id: string) => data?.find((t: { id: string }) => t.id === id)?.short_name ?? "";
        setFete({ id: Date.now(), titre: `pour ${nom(cote === "home" ? m.home_team_id : m.away_team_id)}`, detail: `${nom(m.home_team_id)} ${apres[0]} – ${apres[1]} ${nom(m.away_team_id)}` });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!fete) return;
    window.dispatchEvent(new Event("ar:essai")); // la tribune se lève (si le son est activé)
    const t = setTimeout(() => setFete(null), 2900);
    return () => clearTimeout(t);
  }, [fete]);

  if (!fete) return null;
  return (
    <div key={fete.id} className="essai-voile fixed inset-0 z-50 grid place-items-center bg-bordeaux/80 backdrop-blur-sm pointer-events-none overflow-hidden" role="status" aria-live="polite">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className="confetti rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: COULEURS[i % COULEURS.length], ["--delai" as string]: `${(i % 9) * 0.07}s`, ["--rot" as string]: `${(i % 2 ? 1 : -1) * (360 + i * 40)}deg` }} />
      ))}
      <div className="text-center relative">
        <Poteaux className="h-40 w-auto mx-auto text-white/80" />
        <div className="essai-ballon absolute left-1/2 top-10 -ml-8"><Ballon className="w-16 text-moutarde" /></div>
        <p className="essai-mot groovy text-7xl sm:text-9xl text-moutarde drop-shadow-[0_6px_0_rgba(0,0,0,.35)] mt-2">Essai !</p>
        <p className="text-white text-xl font-bold mt-3 titre">{fete.titre}</p>
        <p className="text-white/80 tnum mt-1">{fete.detail}</p>
      </div>
    </div>
  );
}
