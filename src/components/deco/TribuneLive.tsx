"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import TeamBadge from "@/components/TeamBadge";
import type { TeamLite } from "@/lib/types";
import { Ballon, Echarpe, Pinte, Sifflet, Trompette } from "./Icones";
import { clameur, sonActif } from "@/lib/son";

const CRIS = [
  { id: "allez", texte: "Allez !", Icone: Echarpe, cls: "bg-moutarde text-bordeaux" },
  { id: "essai", texte: "Quel essai !", Icone: Ballon, cls: "bg-vin text-white" },
  { id: "arbitre", texte: "Oh l'arbitre !", Icone: Sifflet, cls: "bg-white text-bordeaux" },
  { id: "banda", texte: "Banda !", Icone: Trompette, cls: "bg-rose text-bordeaux" },
  { id: "sante", texte: "Santé !", Icone: Pinte, cls: "bg-moutarde text-bordeaux" },
] as const;
type CriId = (typeof CRIS)[number]["id"];
type Camp = "h" | "a";
type Bulle = { k: number; id: CriId; x: number; camp: Camp | null };

/**
 * La tribune en direct : chacun choisit son camp et pousse ses cris. Le vumètre montre quelle tribune
 * fait le plus de bruit en ce moment ; les cris sont comptés (par paquets) pour le classement
 * des tribunes du week-end. Temps réel Supabase (broadcast + presence).
 */
export default function TribuneLive({ matchId, enDirect, home, away, totaux, favori }: {
  matchId: string; enDirect: boolean; home: TeamLite; away: TeamLite; totaux: { h: number; a: number }; favori?: string | null;
}) {
  const [bulles, setBulles] = useState<Bulle[]>([]);
  const [presents, setPresents] = useState(1);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [bruit, setBruit] = useState({ h: 0, a: 0 });
  const [total, setTotal] = useState(totaux);
  const canal = useRef<ReturnType<ReturnType<typeof browserClient>["channel"]> | null>(null);
  const dernier = useRef(-1000);
  const k = useRef(0);
  const enAttente = useRef(0);
  const nouveau = useRef(true);
  const ouvert = enDirect;

  // camp mémorisé pour ce match, sinon le club favori
  useEffect(() => {
    let c: Camp | null = null;
    try { c = (localStorage.getItem(`camp-${matchId}`) as Camp | null) ?? null; } catch { /* stockage indisponible */ }
    if (!c && favori) c = favori === home.id ? "h" : favori === away.id ? "a" : null;
    setCamp(c);
  }, [matchId, favori, home.id, away.id]);

  // le vumètre retombe doucement
  useEffect(() => {
    const t = setInterval(() => setBruit((b) => ({ h: b.h * 0.94, a: b.a * 0.94 })), 400);
    return () => clearInterval(t);
  }, []);

  const afficher = (id: CriId, c: Camp | null) => {
    const b = { k: ++k.current, id, x: c === "h" ? 4 + Math.random() * 40 : c === "a" ? 52 + Math.random() * 40 : 8 + Math.random() * 84, camp: c };
    setBulles((l) => [...l.slice(-24), b]);
    if (c) { setBruit((v) => ({ ...v, [c]: Math.min(40, v[c] + 6) })); setTotal((t) => ({ ...t, [c]: t[c] + 1 })); }
    setTimeout(() => setBulles((l) => l.filter((x) => x.k !== b.k)), 2600);
  };

  useEffect(() => {
    const supabase = browserClient();
    const moi = Math.random().toString(36).slice(2);
    const ch = supabase.channel(`tribune-${matchId}`, { config: { broadcast: { self: false }, presence: { key: moi } } });
    ch.on("broadcast", { event: "cri" }, ({ payload }: { payload: { id: CriId; camp?: Camp } }) => {
      if (CRIS.some((c) => c.id === payload?.id)) afficher(payload.id, payload.camp === "h" || payload.camp === "a" ? payload.camp : null);
    })
      .on("presence", { event: "sync" }, () => setPresents(Math.max(1, Object.keys(ch.presenceState()).length)))
      .subscribe((status: string) => { if (status === "SUBSCRIBED") void ch.track({ t: Date.now() }); });
    canal.current = ch;
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // les cris sont comptés par paquets (toutes les 8 secondes) pour le classement des tribunes
  useEffect(() => {
    if (!ouvert || !camp) return;
    const envoyer = () => {
      const n = enAttente.current;
      if (!n) return;
      enAttente.current = 0;
      void browserClient().rpc("tribune_crier", { p_match: matchId, p_team: camp === "h" ? home.id : away.id, p_n: n, p_nouveau: nouveau.current });
      nouveau.current = false;
    };
    const t = setInterval(envoyer, 8000);
    return () => { clearInterval(t); envoyer(); };
  }, [ouvert, camp, matchId, home.id, away.id]);

  const choisir = (c: Camp) => {
    setCamp(c);
    nouveau.current = true;
    try { localStorage.setItem(`camp-${matchId}`, c); } catch { /* stockage indisponible */ }
  };

  const crier = (id: CriId, quand: number) => {
    if (quand - dernier.current < 600) return; // pas de spam
    dernier.current = quand;
    afficher(id, camp);
    if (ouvert && camp) enAttente.current++;
    void canal.current?.send({ type: "broadcast", event: "cri", payload: { id, camp } });
    if (id === "essai" && sonActif()) clameur(0.5);
  };

  const nom = (t: TeamLite) => t.short_name ?? t.name;
  const db = (v: number) => Math.round(62 + Math.min(1, v / 24) * 56); // de 62 dB (tribune calme) à 118 dB (enfer)
  const somme = total.h + total.a;

  return (
    <section aria-labelledby="h-tribune" className="mt-10 relative overflow-hidden rounded-[1.75rem] bg-bordeaux text-white p-5 sm:p-7">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {bulles.map((b) => {
          const c = CRIS.find((x) => x.id === b.id)!;
          return (
            <span key={b.k} className={`cri-envol absolute bottom-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow ${c.cls}`} style={{ left: `${b.x}%` }}>
              <c.Icone className="h-4 w-auto" />{c.texte}
            </span>
          );
        })}
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="h-tribune" className="groovy text-3xl">La tribune {enDirect ? "en direct" : ""}</h2>
          <p className="text-sm text-white/70 mt-1 inline-flex items-center gap-1.5"><span className="pastille" aria-hidden />{presents} supporter{presents > 1 ? "s" : ""} sur cette page</p>
        </div>
        {somme > 0 && <p className="text-sm text-white/70 tnum">{somme.toLocaleString("fr-FR")} cris depuis le coup d&apos;envoi</p>}
      </div>

      {/* le vumètre : une jauge par tribune */}
      <div className="relative mt-5 grid grid-cols-2 gap-3">
        {(["h", "a"] as const).map((c) => {
          const t = c === "h" ? home : away;
          const actif = camp === c;
          const niveau = Math.min(1, bruit[c] / 24);
          return (
            <button key={c} type="button" onClick={() => choisir(c)} aria-pressed={actif}
              className={`text-left rounded-2xl p-3 border-2 ${actif ? "border-moutarde bg-white/10" : "border-white/15 hover:border-white/40"}`}>
              <span className="flex items-center gap-2 min-w-0">
                <TeamBadge team={t} size="sm" />
                <span className="font-bold truncate">{nom(t)}</span>
                {actif && <span className="ml-auto shrink-0 text-[11px] font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5">Mon camp</span>}
              </span>
              <span className="mt-3 flex items-end gap-[3px] h-10" aria-hidden>
                {Array.from({ length: 16 }, (_, i) => {
                  const allume = i / 16 < niveau;
                  return <span key={i} className="flex-1 rounded-sm transition-[height,background-color] duration-200"
                    style={{ height: `${30 + i * 4.5}%`, background: allume ? (i > 12 ? "var(--alerte)" : i > 8 ? "var(--moutarde)" : "#f6e4e8") : "rgba(255,255,255,.12)" }} />;
                })}
              </span>
              <span className="mt-1.5 flex justify-between text-xs text-white/70 tnum">
                <span>{db(bruit[c])} dB</span><span>{total[c].toLocaleString("fr-FR")} cris</span>
              </span>
            </button>
          );
        })}
      </div>

      {!camp && <p className="relative mt-3 text-sm text-moutarde font-semibold">Choisissez votre tribune pour faire monter le son de votre camp.</p>}

      <div className="relative mt-4 flex flex-wrap gap-2" role="group" aria-label="Lancer un cri">
        {CRIS.map((c) => (
          <button key={c.id} onClick={(e) => crier(c.id, e.timeStamp)} className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold hover:-translate-y-0.5 ${c.cls}`}>
            <c.Icone className="h-5 w-auto group-active:animate-[roulis_.5s_ease-in-out]" />{c.texte}
          </button>
        ))}
      </div>
      <p className="relative mt-4 text-xs text-white/60">
        {ouvert ? "Vos cris s'affichent en direct chez tous ceux qui suivent ce match et comptent pour le classement des tribunes du week-end." : "Les cris comptent pour le classement des tribunes pendant le match."}
      </p>
    </section>
  );
}
