"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { urlMatch } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { fmtDay, fmtTime, isLive } from "@/lib/format";
import type { Match, MatchFull } from "@/lib/types";

/** Tableau d'affichage : bandeau des scores en direct, présent sur toutes les pages. */
export default function Scoreboard({ initial }: { initial: MatchFull[] }) {
  const [matches, setMatches] = useState(initial);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const liste = useRef<HTMLUListElement>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel("tableau")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload: { new: unknown }) => {
        const m = payload.new as Match;
        setMatches((list) => list.map((x) => {
          if (x.id !== m.id) return x;
          // le score a bougé : on fait clignoter la case
          if (x.home_score !== m.home_score || x.away_score !== m.away_score) setFlash((f) => ({ ...f, [m.id]: Date.now() }));
          return { ...x, ...m, home: x.home, away: x.away, competition: x.competition };
        }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // flèches de défilement, seulement quand il reste des matchs à voir de ce côté
  useEffect(() => {
    const el = liste.current;
    if (!el) return;
    const maj = () => setBords({ gauche: el.scrollLeft > 4, droite: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    maj();
    el.addEventListener("scroll", maj, { passive: true });
    window.addEventListener("resize", maj);
    return () => { el.removeEventListener("scroll", maj); window.removeEventListener("resize", maj); };
  }, [matches.length]);
  const defiler = (sens: 1 | -1) => liste.current?.scrollBy({ left: sens * liste.current.clientWidth * 0.8, behavior: "smooth" });

  const liveCount = matches.filter((m) => isLive(m.status)).length;

  return (
    <div data-scoreboard className="bg-bordeaux text-white">
      <div className="max-w-6xl mx-auto flex items-stretch">
        <Link href="/matchs" className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold border-r border-white/10 hover:bg-white/5">
          {liveCount > 0 ? (<><span className="pastille" aria-hidden /><span>{liveCount} en direct</span></>) : <span>Matchs</span>}
        </Link>
        {matches.length === 0 ? (
          <p className="px-4 py-2 text-sm text-white/70 self-center">Aucun grand match ces jours-ci. Tout le calendrier est dans Matchs.</p>
        ) : (
          <div className="relative min-w-0 flex-1">
            <ul ref={liste} className="defile-scroll flex overflow-x-auto snap-x" aria-label="Scores et prochains matchs">
              {matches.map((m) => (
                <li key={`${m.id}-${flash[m.id] ?? 0}`} className={`shrink-0 snap-start border-r border-white/10 ${flash[m.id] ? "flash" : ""}`}>
                  <Case m={m} />
                </li>
              ))}
            </ul>
            {bords.gauche && (
              <button type="button" onClick={() => defiler(-1)} aria-label="Matchs précédents"
                className="hidden sm:grid absolute left-0 inset-y-0 w-10 place-items-center bg-gradient-to-r from-bordeaux via-bordeaux/90 to-transparent text-xl">‹</button>
            )}
            {bords.droite && (
              <button type="button" onClick={() => defiler(1)} aria-label="Matchs suivants"
                className="hidden sm:grid absolute right-0 inset-y-0 w-10 place-items-center bg-gradient-to-l from-bordeaux via-bordeaux/90 to-transparent text-xl">›</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Logo({ t }: { t: MatchFull["home"] }) {
  return t.logo_url
    ? <span className="w-5 h-5 shrink-0 grid place-items-center rounded bg-white/95 p-0.5"><img src={t.logo_url} alt="" loading="lazy" className="max-w-full max-h-full object-contain" /></span>
    : <span aria-hidden className="w-5 h-5 shrink-0 rounded-full" style={{ background: t.color ?? "var(--vin)" }} />;
}

function Case({ m }: { m: MatchFull }) {
  const live = isLive(m.status);
  const done = m.status === "finished";
  const winner = done && m.home_score != null && m.away_score != null ? (m.home_score > m.away_score ? "h" : m.away_score > m.home_score ? "a" : null) : null;
  const nom = (t: MatchFull["home"]) => t.short_name ?? t.name;
  const etat = live
    ? (m.status === "halftime" ? "Mi-temps" : m.clock && /^\d/.test(m.clock) ? m.clock : "En direct")
    : done ? "Terminé"
    : memeJour(m.kickoff_at) ? `Aujourd'hui ${fmtTime(m.kickoff_at)}` : `${fmtDay(m.kickoff_at, { weekday: "short", day: "numeric" })} ${fmtTime(m.kickoff_at)}`;
  return (
    <Link href={urlMatch(m)} className="block w-44 px-3 py-1.5 hover:bg-white/5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-white/55">{m.competition.short_name ?? m.competition.name}</span>
        <span className={`shrink-0 ${live ? "text-moutarde font-bold" : "text-white/55"}`}>{live && <span className="pastille mr-1 align-middle" aria-hidden />}{etat}</span>
      </div>
      {(["h", "a"] as const).map((side) => {
        const t = side === "h" ? m.home : m.away;
        const s = side === "h" ? m.home_score : m.away_score;
        const perdant = winner && winner !== side;
        return (
          <div key={side} className="mt-0.5 flex items-center gap-2 leading-tight">
            <Logo t={t} />
            <span className={`flex-1 truncate text-sm ${perdant ? "text-white/55" : "font-semibold"}`}>{nom(t)}</span>
            {(live || done) && <span className={`titre tnum text-sm font-extrabold ${live ? "text-moutarde" : perdant ? "text-white/55" : ""}`}>{s ?? "–"}</span>}
          </div>
        );
      })}
    </Link>
  );
}

function memeJour(iso: string) {
  return fmtDay(iso, { day: "numeric", month: "numeric" }) === fmtDay(new Date(), { day: "numeric", month: "numeric" });
}
